import fs from "fs";
import { BASE_URL } from "./config.js";

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

  res.send(`
<Response>
${
  actionUrl
    ? `<Gather input="speech" bargeIn="true" speechTimeout="auto" timeout="3"
          action="${actionUrl}" method="POST">
        <Play>${BASE_URL}/tts?text=${encodeURIComponent(text)}</Play>
      </Gather>
      <Redirect method="POST">${actionUrl}</Redirect>`
    : `<Play>${BASE_URL}/tts?text=${encodeURIComponent(text)}</Play>
       <Hangup/>`
}
</Response>
`);
}

export function hangup(res, text) {
  res.send(`
<Response>
  <Play>${BASE_URL}/tts?text=${encodeURIComponent(text)}</Play>
  <Hangup/>
</Response>
`);
}
