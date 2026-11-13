import { isProd, smsDriver } from "../env";
import { ApiError } from "../http";

/**
 * SMS delivery. Drivers:
 *  - console (default, development only): prints the message to the server terminal.
 *  - twilio: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM.
 * For India, transactional OTP SMS must go through a DLT-registered sender (for example MSG91 or Twilio with DLT).
 * Add another driver here when you pick a provider.
 */
export const smsIsConsole = () => smsDriver() === "console";

export async function sendSms(to: string, body: string) {
  const driver = smsDriver();

  if (driver === "console") {
    if (isProd()) throw new ApiError(503, "SMS delivery is not configured.", "sms_unavailable");
    console.log(`\n[DEV SMS] to ${to}: ${body}\n`);
    return;
  }

  if (driver === "twilio") {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;
    if (!sid || !token || !from) throw new ApiError(503, "SMS delivery is not configured.", "sms_unavailable");
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    });
    if (!res.ok) {
      console.error("[sms] Twilio error", res.status, await res.text());
      throw new ApiError(502, "Could not send the SMS. Please try again.", "sms_failed");
    }
    return;
  }

  throw new ApiError(503, "SMS delivery is not configured.", "sms_unavailable");
}
