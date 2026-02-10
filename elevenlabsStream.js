// elevenlabsStream.js
import WebSocket from "ws";
import {
  ELEVENLABS_API_KEY,
  ELEVENLABS_VOICE_ID
} from "./config.js";

/**
 * Streams ElevenLabs audio directly into Twilio Media Stream
 * @param {string} text
 * @param {WebSocket} twilioWs
 * @param {string} streamSid
 */
export function elevenLabsStream(text, twilioWs, streamSid) {
  const elWs = new WebSocket(
    `wss://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream-input`,
    {
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY
      }
    }
  );

  elWs.on("open", () => {
    elWs.send(
      JSON.stringify({
        text,
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.7
        }
      })
    );
  });

  elWs.on("message", msg => {
    const data = JSON.parse(msg.toString());

    if (!data.audio) return;

    // 🔥 SEND AUDIO TO TWILIO IN REAL TIME
    twilioWs.send(
      JSON.stringify({
        event: "media",
        streamSid,
        media: {
          payload: data.audio // already base64
        }
      })
    );
  });

  elWs.on("close", () => {});
  elWs.on("error", err =>
    console.error("ElevenLabs WS error:", err)
  );
}
