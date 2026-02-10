import fetch from "node-fetch";
import {
  TWILIO_SID,
  TWILIO_TOKEN,
  TWILIO_NUMBER,
  BASE_URL
} from "./config.js";

const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Calls.json`;

const body = new URLSearchParams({
  To: "+918697744701",
  From: TWILIO_NUMBER,
  Url: `${BASE_URL}/voice`
});

const res = await fetch(url, {
  method: "POST",
  headers: {
    Authorization:
      "Basic " +
      Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64"),
    "Content-Type": "application/x-www-form-urlencoded"
  },
  body
});

console.log(await res.text());
