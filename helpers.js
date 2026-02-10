import fs from "fs";
import { BASE_URL } from "./config.js";

function xmlEscape(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function logCall(text) {
  fs.appendFileSync(
    "./logs/call.log",
    `${new Date().toISOString()} | ${text}\n`
  );
}

export function speakAndListen(res, text, action, callSid) {
  let actionUrl = action
    ? action.startsWith("http")
      ? action
      : `${BASE_URL}/${action}`
    : null;

  if (callSid && actionUrl) {
    actionUrl +=
      (actionUrl.includes("?") ? "&" : "?") +
      "CallSid=" +
      encodeURIComponent(callSid);
  }

  // 🔥 XML ESCAPE EVERYTHING
  const safeAction = actionUrl ? xmlEscape(actionUrl) : null;
  const safeText = xmlEscape(text);
  const playUrl = xmlEscape(
    `${BASE_URL}/tts?text=${encodeURIComponent(text)}`
  );

  res.send(`
<Response>
${
  safeAction
    ? `<Gather input="speech"
        bargeIn="true"
        speechTimeout="auto"
        timeout="3"
        action="${safeAction}"
        method="POST">
        <Play>${playUrl}</Play>
      </Gather>
      <Redirect method="POST">${safeAction}</Redirect>`
    : `<Play>${playUrl}</Play><Hangup/>`
}
</Response>
`);
}

export function hangup(res, text) {
  const playUrl = `${BASE_URL}/tts?text=${encodeURIComponent(text)}`;

  res.send(`
<Response>
  <Play>${xmlEscape(playUrl)}</Play>
  <Hangup/>
</Response>
`);
}
