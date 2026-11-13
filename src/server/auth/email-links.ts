import { createHash, randomBytes } from "node:crypto";
import { db, query } from "../db";
import { appUrl, emailDriver, isProd } from "../env";
import { channelConfigured, deliver } from "../notifications/providers";
import { getSettings } from "../orders/settings";
import { ApiError } from "../http";

/*
 * Single-use links sent by email: verify an email address, reset a forgotten password.
 * The raw token exists only in the email; the database keeps its SHA-256, so a leaked table gives no working links.
 */

export type LinkPurpose = "verify_email" | "reset_password";

const TTL_MINUTES: Record<LinkPurpose, number> = { verify_email: 60 * 24, reset_password: 30 };

const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");

/** Whether email links can actually be delivered on this server (always true in development: printed to the terminal). */
export const emailLinksAvailable = () => channelConfigured("email");

async function issue(userId: string, email: string, purpose: LinkPurpose): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  // Only the newest link of each kind works: older unused ones are retired.
  await query(`update email_tokens set used_at = now() where user_id = $1 and purpose = $2 and used_at is null`, [userId, purpose]);
  await query(
    `insert into email_tokens (user_id, purpose, token_hash, email, expires_at) values ($1, $2, $3, $4, now() + ($5 || ' minutes')::interval)`,
    [userId, purpose, hash(raw), email, String(TTL_MINUTES[purpose])],
  );
  return raw;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function html(shop: string, phone: string, heading: string, lines: string[], cta: string, link: string) {
  const body = lines.map((l) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#334155">${esc(l)}</p>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;padding:24px 12px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden" cellspacing="0" cellpadding="0">
<tr><td style="background:#0b5a2b;padding:18px 24px;color:#fff;font-size:20px;font-weight:700">${esc(shop)}</td></tr>
<tr><td style="padding:24px"><h1 style="margin:0 0 16px;font-size:19px;color:#0f172a">${esc(heading)}</h1>${body}
<p style="margin:22px 0 0"><a href="${esc(link)}" style="background:#16803c;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:10px;display:inline-block">${esc(cta)}</a></p>
<p style="margin:18px 0 0;font-size:12px;color:#64748b;word-break:break-all">Or paste this link into your browser: ${esc(link)}</p></td></tr>
<tr><td style="padding:14px 24px;background:#f8fafc;font-size:12px;color:#64748b">If you did not ask for this, you can ignore this email. Questions? Call ${esc(phone)}.</td></tr>
</table></td></tr></table></body></html>`;
}

/**
 * Create a link and email it. Returns the link itself only in development with the console email driver,
 * so it can be shown on screen the same way development OTP codes are.
 */
export async function sendEmailLink(user: { id: string; name: string | null; email: string }, purpose: LinkPurpose): Promise<{ devLink?: string }> {
  if (!emailLinksAvailable()) throw new ApiError(503, "Email isn't set up on this site yet. Please contact the store.", "email_unavailable");
  const raw = await issue(user.id, user.email, purpose);
  const link = `${appUrl()}/${purpose === "reset_password" ? "reset-password" : "verify-email"}?token=${raw}`;
  const s = await getSettings();
  const first = (user.name ?? "").trim().split(/\s+/)[0] || "there";
  const spec =
    purpose === "reset_password"
      ? {
          subject: `Reset your ${s.shop.name} password`,
          heading: "Reset your password",
          lines: [`Hi ${first},`, "We received a request to reset the password for your account. The link below works once and expires in 30 minutes."],
          cta: "Choose a new password",
        }
      : {
          subject: `Confirm your email for ${s.shop.name}`,
          heading: "Confirm your email address",
          lines: [`Hi ${first},`, "Please confirm this is your email address, so we can send you order updates and help you recover your account. The link expires in 24 hours."],
          cta: "Confirm email",
        };
  const text = `${spec.lines.join("\n\n")}\n\n${spec.cta}: ${link}\n\nIf you did not ask for this, you can ignore this email.`;
  await deliver("email", { to: user.email, subject: spec.subject, text, html: html(s.shop.name, s.shop.phone, spec.heading, spec.lines, spec.cta, link), params: [], template: `mn_${purpose}` });
  return !isProd() && emailDriver() === "console" ? { devLink: link } : {};
}

/**
 * Use a link. Atomic: the token row is locked and marked used in the same transaction as the change it authorises,
 * so a link can never be used twice. For a reset, the email must still be the account's email.
 */
export async function consumeEmailLink<T>(raw: string, purpose: LinkPurpose, apply: (t: { query: typeof query }, row: { userId: string; email: string }) => Promise<T>): Promise<T | null> {
  if (!raw || raw.length < 20 || raw.length > 100) return null;
  const d = await db();
  return d.tx(async (t) => {
    const rows = await t.query<{ id: string; user_id: string; email: string; user_email: string | null; status: string }>(
      `select e.id, e.user_id, e.email, u.email as user_email, u.status
         from email_tokens e join users u on u.id = e.user_id
        where e.token_hash = $1 and e.purpose = $2 and e.used_at is null and e.expires_at > now()
        for update of e`,
      [hash(raw), purpose],
    );
    const r = rows[0];
    if (!r || r.status !== "active" || (r.user_email ?? "").toLowerCase() !== r.email.toLowerCase()) return null;
    await t.query(`update email_tokens set used_at = now() where id = $1`, [r.id]);
    return apply(t as { query: typeof query }, { userId: r.user_id, email: r.email });
  });
}
