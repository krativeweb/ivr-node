import fetch from "node-fetch";
import { OPENAI_API_KEY } from "./config.js";

function quickAnswerDetect(text) {
  text = text.toLowerCase().trim();

  if (/(stop|end|cancel|quit)/.test(text)) return "STOP";
  if (/(repeat|say again|once more)/.test(text)) return "REPEAT";
  if (/(skip|next|pass)/.test(text)) return "SKIP";
  if (/^(yes|yeah|yep|correct|right|no|nope|ok|okay)$/.test(text)) return "ANSWER";

  if (
    /(what|why|how|when|where|who|which|whose)/i.test(text) ||
    /(can|could|would|should|may|might)\s+(you|we|i)/i.test(text) ||
    /(explain|clarify|describe|tell me|help me understand)/i.test(text) ||
    /(i don.?t understand|confused|not sure)/i.test(text)
  ) {
    return "QUESTION";
  }

  return null;
}

export async function detectIntentGPT(text, currentQuestion = "") {
  const quick = quickAnswerDetect(text);
  if (quick) return quick;

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an IVR intent classifier.

The assistant previously asked this question:
"${currentQuestion}"

Rules:
- If user is answering the question → ANSWER
- If user is asking something → QUESTION
- If user wants repetition → REPEAT
- If user wants to skip → SKIP
- If user wants to stop → STOP
- If unsure → UNCLEAR

Reply with ONE WORD only.`
      },
      { role: "user", content: text }
    ],
    temperature: 0
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const json = await res.json();
  return (json.choices?.[0]?.message?.content || "UNCLEAR").trim().toUpperCase();
}
