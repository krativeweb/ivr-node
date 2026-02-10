import { conn } from "./db.js";
import { logCall, speakAndListen, hangup } from "./helpers.js";
import { detectIntentGPT } from "./intent.js";
import { answerFromBook } from "./rag_answer.js";

export async function processHandler(req, res) {
  res.type("text/xml");

  const text = (req.body.SpeechResult || "").trim();
  const callSid = req.body.CallSid;
  const qid = req.query.qid;

  logCall("USER: " + text);

  if (!callSid) return hangup(res, "Sorry, something went wrong.");

  let qText = "the previous question";
  if (qid) {
    const [[q]] = await conn.query(
      "SELECT question FROM bot_questions WHERE id = ?",
      [qid]
    );
    if (q) qText = q.question;
  }

  const intent = await detectIntentGPT(text, qText);

  switch (intent) {
    case "STOP":
      return hangup(res, "No problem. Thank you for your time.");

    case "REPEAT":
      return speakAndListen(res, "Sure. " + qText, `process?qid=${qid}`, callSid);

    case "SKIP":
      return speakAndListen(res, "Alright, skipping this question.", "voice", callSid);

    case "QUESTION": {
      const answer = await answerFromBook(text);
      return speakAndListen(
        res,
        answer + " You may now answer the question.",
        `process?qid=${qid}`,
        callSid
      );
    }

    case "ANSWER":
      if (qid) {
        await conn.query(
          "INSERT INTO user_answers (call_sid, question_id, answer) VALUES (?, ?, ?)",
          [callSid, qid, text]
        );

        await conn.query(
          "UPDATE call_questions SET created_at = NOW() WHERE call_sid = ? AND question_id = ?",
          [callSid, qid]
        );
      }

      return speakAndListen(res, "Thank you. Next question.", "voice", callSid);

    default:
      return speakAndListen(
        res,
        "Please answer the question, or say repeat, skip, or stop.",
        `process?qid=${qid}`,
        callSid
      );
  }
}
