import WebSocket from "ws";
import {
  ELEVENLABS_API_KEY,
  ELEVENLABS_VOICE_ID
} from "./config.js";

export function elevenLabsStream(text, res) {
  const ws = new WebSocket(
    `wss://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream-input`,
    { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
  );

  res.type("audio/mpeg");

  ws.on("open", () => {
    ws.send(
      JSON.stringify({
        text,
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.7
        }
      })
    );
  });

  ws.on("message", msg => {
    const data = JSON.parse(msg.toString());
    if (data.audio) {
      res.write(Buffer.from(data.audio, "base64"));
    }
  });

  ws.on("close", () => res.end());
  ws.on("error", () => res.end());
}
