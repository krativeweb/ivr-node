import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { WebSocketServer } from "ws";
import fetch from "node-fetch";

import { conn } from "./db.js";
import { hangup } from "./helpers.js";
import { elevenLabsStream } from "./elevenlabsStream.js";
import { processHandler } from "./process.js";

import {
  TWILIO_SID,
  TWILIO_TOKEN,
  TWILIO_NUMBER,
  BASE_URL
} from "./config.js";

/* ===============================
   EXPRESS APP
================================ */
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

/* ===============================
   HEALTH CHECK (RENDER SAFE)
================================ */
app.get("/", (req, res) => {
  res.send("IVR Node server running ✅");
});

/* ===============================
   TWILIO VOICE ENTRY (NO PLAY)
================================ */
app.post("/voice", (req, res) => {
  res.type("text/xml");

  res.send(`
<Response>
  <Connect>
    <Stream url="wss://${req.headers.host}/media" />
  </Connect>
</Response>
`);
});

/* ===============================
   PROCESS (INTENT LOGIC — UNCHANGED)
   ⚠️ Requires STT input
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
   BROWSER → START CALL
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
   HTTP SERVER (REQUIRED)
================================ */
const server = http.createServer(app);

/* ===============================
   TWILIO MEDIA STREAM SERVER
================================ */
const wss = new WebSocketServer({ server, path: "/media" });

wss.on("connection", ws => {
  let streamSid = null;
  let callSid = null;

  ws.on("message", async msg => {
    const data = JSON.parse(msg.toString());

    /* -------- STREAM START -------- */
    if (data.event === "start") {
      streamSid = data.start.streamSid;
      callSid = data.start.callSid;

      console.log("🎧 Media stream started:", streamSid);

      /* FETCH FIRST QUESTION (NO LOGIC CHANGE) */
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
        elevenLabsStream(
          "Thank you. All questions are completed. Goodbye.",
          ws,
          streamSid
        );
        return;
      }

      /* INSERT QUESTION (SAME AS BEFORE) */
      conn.query(
        "INSERT INTO call_questions (call_sid, question_id) VALUES (?, ?)",
        [callSid, q.id]
      ).catch(() => {});

      /* 🔥 INSTANT SPEAK */
      elevenLabsStream(q.question, ws, streamSid);
    }

    /* -------- CALL ENDED -------- */
    if (data.event === "stop") {
      console.log("📴 Media stream stopped:", streamSid);
      ws.close();
    }
  });

  ws.on("close", () => {
    console.log("❌ WebSocket closed");
  });
});

/* ===============================
   START SERVER
================================ */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🔥 INSTANT IVR SERVER running on port ${PORT}`);
});
