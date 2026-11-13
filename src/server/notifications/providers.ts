import { emailDriver, isProd, smsDriver, whatsappDriver } from "../env";
import { sendSms } from "../auth/sms";
import { ApiError } from "../http";

/** Thrown when retrying cannot help (bad address, rejected template). The message goes straight to "dead". */
export class PermanentSendError extends Error {}

export type Channel = "email" | "sms" | "whatsapp";
export type Outgoing = { to: string; subject: string; text: string; html: string | null; params: string[]; template: string };

/** True when the channel can actually send on this server. */
export function channelConfigured(channel: Channel): boolean {
  if (channel === "email") {
    const d = emailDriver();
    if (d === "console") return !isProd();
    if (d === "resend") return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
    if (d === "brevo") return Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);
    return false;
  }
  if (channel === "sms") {
    const d = smsDriver();
    if (d === "console") return !isProd();
    if (d === "twilio") return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
    return false;
  }
  const d = whatsappDriver();
  if (d === "console") return !isProd();
  if (d === "cloud") return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
  return false;
}

async function post(url: string, init: { headers: Record<string, string>; body: unknown }): Promise<{ status: number; json: Record<string, unknown> }> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...init.headers }, body: JSON.stringify(init.body), signal: AbortSignal.timeout(15_000) });
  } catch (e) {
    throw new Error(`Network error: ${(e as Error).message}`); // retryable
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status >= 400 && res.status < 500 && res.status !== 429 && res.status !== 408) throw new PermanentSendError(`Provider rejected the message (${res.status}): ${JSON.stringify(json).slice(0, 300)}`);
  if (res.status >= 400) throw new Error(`Provider error ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return { status: res.status, json };
}

const parseFrom = (from: string) => {
  const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].replace(/^"|"$/g, ""), email: m[2] } : { name: "", email: from.trim() };
};

async function sendEmail(m: Outgoing): Promise<string> {
  const d = emailDriver();
  if (d === "console") {
    if (isProd()) throw new PermanentSendError("Email is not configured.");
    console.log(`\n[DEV EMAIL] to ${m.to}\nSubject: ${m.subject}\n${m.text}\n`);
    return "console";
  }
  const from = process.env.EMAIL_FROM ?? "";
  if (d === "resend") {
    const key = process.env.RESEND_API_KEY ?? "";
    if (!key || !from) throw new PermanentSendError("Email is not configured.");
    const { json } = await post(`${process.env.EMAIL_API_BASE ?? "https://api.resend.com"}/emails`, { headers: { Authorization: `Bearer ${key}` }, body: { from, to: [m.to], subject: m.subject, text: m.text, ...(m.html ? { html: m.html } : {}) } });
    return String(json.id ?? "");
  }
  if (d === "brevo") {
    const key = process.env.BREVO_API_KEY ?? "";
    if (!key || !from) throw new PermanentSendError("Email is not configured.");
    const f = parseFrom(from);
    const { json } = await post(`${process.env.EMAIL_API_BASE ?? "https://api.brevo.com"}/v3/smtp/email`, { headers: { "api-key": key }, body: { sender: { email: f.email, ...(f.name ? { name: f.name } : {}) }, to: [{ email: m.to }], subject: m.subject, textContent: m.text, ...(m.html ? { htmlContent: m.html } : {}) } });
    return String(json.messageId ?? "");
  }
  throw new PermanentSendError("Email is not configured.");
}

async function sendSmsMessage(m: Outgoing): Promise<string> {
  try {
    await sendSms(m.to, m.text);
  } catch (e) {
    if (e instanceof ApiError && e.code === "sms_unavailable") throw new PermanentSendError("SMS is not configured.");
    throw e;
  }
  return smsDriver();
}

async function sendWhatsApp(m: Outgoing): Promise<string> {
  const d = whatsappDriver();
  if (d === "console") {
    if (isProd()) throw new PermanentSendError("WhatsApp is not configured.");
    console.log(`\n[DEV WHATSAPP] to ${m.to} (template ${m.template}): ${m.params.join(" | ")}\n${m.text}\n`);
    return "console";
  }
  if (d === "cloud") {
    const token = process.env.WHATSAPP_TOKEN ?? "";
    const phoneId = process.env.WHATSAPP_PHONE_ID ?? "";
    if (!token || !phoneId) throw new PermanentSendError("WhatsApp is not configured.");
    const { json } = await post(`${process.env.WHATSAPP_API_BASE ?? "https://graph.facebook.com/v20.0"}/${phoneId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messaging_product: "whatsapp", to: m.to.replace(/^\+/, ""), type: "template",
        template: { name: m.template, language: { code: process.env.WHATSAPP_LANG ?? "en" }, components: [{ type: "body", parameters: m.params.map((text) => ({ type: "text", text })) }] },
      },
    });
    const first = (json.messages as { id?: string }[] | undefined)?.[0];
    return String(first?.id ?? "");
  }
  throw new PermanentSendError("WhatsApp is not configured.");
}

export function deliver(channel: Channel, m: Outgoing): Promise<string> {
  return channel === "email" ? sendEmail(m) : channel === "sms" ? sendSmsMessage(m) : sendWhatsApp(m);
}
