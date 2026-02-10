import dotenv from "dotenv";
dotenv.config();

export const BASE_URL = process.env.BASE_URL;
export const TWILIO_SID = process.env.TWILIO_SID;
export const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
export const TWILIO_NUMBER = process.env.TWILIO_NUMBER;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
export const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
