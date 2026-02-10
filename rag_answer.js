import fetch from "node-fetch";
import { OPENAI_API_KEY } from "./config.js";
import { conn } from "./db.js";

function cosineSimilarity(a, b) {
  let dot = 0,
    normA = 0,
    normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function getEmbedding(text) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text
    })
  });

  const json = await res.json();
  return json.data[0].embedding;
}

async function askAI(context, question) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Answer strictly from the provided book content only." },
        { role: "user", content: `Book Content:\n${context}\n\nQuestion:\n${question}` }
      ]
    })
  });

  const json = await res.json();
  return json.choices?.[0]?.message?.content || "";
}

export async function answerFromBook(question) {
  const qEmbedding = await getEmbedding(question);
  const [rows] = await conn.query("SELECT chunk_text, embedding FROM document_chunks");

  const ranked = rows.map(r => ({
    score: cosineSimilarity(qEmbedding, JSON.parse(r.embedding)),
    text: r.chunk_text
  }));

  ranked.sort((a, b) => b.score - a.score);

  const context = ranked.slice(0, 3).map(r => r.text).join("\n");
  return askAI(context, question);
}
