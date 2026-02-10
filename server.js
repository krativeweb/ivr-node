import express from "express";
import bodyParser from "body-parser";
import { conn } from "./db.js";
import { speakAndListen, hangup } from "./helpers.js";
import { elevenLabsStream } from "./elevenlabsStream.js";
import { processHandler } from "./process.js";
import fetch from "node-fetch";
import {
  TWILIO_SID,
  TWILIO_TOKEN,
  TWILIO_NUMBER,
  BASE_URL
} from "./config.js";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

/* ===============================
   HEALTH CHECK (RENDER NEEDS THIS)
================================ */
app.get("/", (req, res) => {
  res.send("IVR Node server running ✅");
});

/* ===============================
   TWILIO VOICE ENTRY
================================ */
app.post("/voice", async (req, res) => {
  try {
    res.type("text/xml");

    const callSid = req.body.CallSid;
    if (!callSid) return hangup(res, "Sorry, something went wrong.");

    const [[q]] = await conn.query(
      `
      SELECT q.id, q.question
      FROM bot_questions q
      WHERE q.id NOT IN (
        SELECT question_id FROM call_questions WHERE call_sid = ?
      )
      ORDER BY q.id ASC
      LIMIT 1
      `,
      [callSid]
    );

    if (!q) {
      return hangup(res, "Thank you. All questions are completed. Goodbye.");
    }

    await conn.query(
      "INSERT INTO call_questions (call_sid, question_id) VALUES (?, ?)",
      [callSid, q.id]
    );

    speakAndListen(res, q.question, `process?qid=${q.id}`, callSid);
  } catch (err) {
    console.error("VOICE ERROR:", err);
    hangup(res, "A system error occurred. Please try again later.");
  }
});

/* ===============================
   PROCESS (SPEECH RESULT)
================================ */
app.post("/process", async (req, res) => {
  try {
    await processHandler(req, res);
  } catch (err) {
    console.error("PROCESS ERROR:", err);
    hangup(res, "A system error occurred.");
  }
});

/* ===============================
   ELEVENLABS STREAM (INSTANT)
================================ */
app.get("/tts", (req, res) => {
  try {
    elevenLabsStream(req.query.text || "", res);
  } catch (err) {
    console.error("TTS ERROR:", err);
    res.end();
  }
});

/* ===============================
   BROWSER → CALL API (NEW)
================================ */
app.get("/call", async (req, res) => {
  try {
    const phone = req.query.phone;

    if (!phone) {
      return res.send("❌ Phone number missing. Use ?phone=%2B91XXXXXXXXXX");
    }

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          To: phone,
          From: TWILIO_NUMBER,
          Url: `${BASE_URL}/voice`
        })
      }
    );

    const result = await twilioRes.text();

    res.send(`
      <h2>📞 Call Initiated</h2>
      <p>Calling: <b>${phone}</b></p>
      <pre>${result}</pre>
    `);
  } catch (err) {
    console.error("CALL ERROR:", err);
    res.status(500).send("❌ Call failed");
  }
});

/* ===============================
   START SERVER (RENDER SAFE)
================================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ IVR Node server running on port ${PORT}`)
);

