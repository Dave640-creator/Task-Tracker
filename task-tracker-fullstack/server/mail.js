// Sends the "reset password" email with Resend (https://resend.com). Needs RESEND_API_KEY.
import { config } from "./config.js";

export const canSendMail = () => Boolean(config.resendKey);

export async function sendResetEmail(to, link) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + config.resendKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: config.mailFrom,
      to,
      subject: "Reset your Task Tracker password",
      html: '<p>Click the link to choose a new password. It works for 30 minutes.</p><p><a href="' + link + '">' + link + "</a></p>",
    }),
  });
  if (!response.ok) console.error("Resend error", response.status, await response.text());
}
