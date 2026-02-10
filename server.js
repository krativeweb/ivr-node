import express from "express";
import bodyParser from "body-parser";
import { conn } from "./db.js";
import { speakAndListen, hangup } from "./helpers.js";
import { elevenLabsStream } from "./elevenlabsStream.js";
import { processHandler } from "./process.js";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.post("/voice", async (req, res) => {
  res.type("text/xml");

  const callSid = req.body.CallSid;
  if (!callSid) return hangup(res, "Sorry, something went wrong.");

  const [[q]] = await conn.query(`
    SELECT q.id, q.question
    FROM bot_questions q
    WHERE q.id NOT IN (
      SELECT question_id FROM call_questions WHERE call_sid = ?
    )
    ORDER BY q.id ASC LIMIT 1
  `, [callSid]);

  if (!q) return hangup(res, "Thank you. All questions are completed. Goodbye.");

  await conn.query(
    "INSERT INTO call_questions (call_sid, question_id) VALUES (?, ?)",
    [callSid, q.id]
  );

  speakAndListen(res, q.question, `process?qid=${q.id}`, callSid);
});

app.post("/process", processHandler);

app.get("/tts", (req, res) => {
  elevenLabsStream(req.query.text || "", res);
});

app.listen(3000, () => console.log("✅ IVR Node server running"));
