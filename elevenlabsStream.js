// elevenlabsStream.js
import WebSocket from "ws";
import {
  ELEVENLABS_API_KEY,
  ELEVENLABS_VOICE_ID
} from "./config.js";

/**
 * REAL INSTANT STREAMING
 * ElevenLabs → Twilio Media Stream
 */
export function elevenLabsStream(text, twilioWs, streamSid) {
  const elWs = new WebSocket(
    `wss://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream-input?model_id=eleven_monolingual_v1`,
    {
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY
      }
    }
  );

  elWs.on("open", () => {
    console.log("🟢 ElevenLabs connected");

    // 🔥 CRITICAL: Send begin packet first (for low latency)
    elWs.send(
      JSON.stringify({
        text: " ", // small starter packet (VERY IMPORTANT)
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.7
        },
        output_format: "ulaw_8000"
      })
    );

    // 🔥 Then send actual text
    elWs.send(
      JSON.stringify({
        text: text,
        try_trigger_generation: true
      })
    );

    // 🔥 Close text input
    elWs.send(JSON.stringify({ text: "" }));
  });

  elWs.on("message", msg => {
    const data = JSON.parse(msg.toString());

    if (data.audio) {
      // 🔥 STREAM DIRECTLY TO TWILIO
      twilioWs.send(
        JSON.stringify({
          event: "media",
          streamSid,
          media: {
            payload: data.audio
          }
        })
      );
    }

    if (data.isFinal) {
      console.log("✅ ElevenLabs finished streaming");
      elWs.close();
    }
  });

  elWs.on("error", err => {
    console.error("❌ ElevenLabs error:", err);
  });

  elWs.on("close", () => {
    console.log("🔴 ElevenLabs closed");
  });
}
