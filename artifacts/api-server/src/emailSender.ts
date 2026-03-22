import nodemailer from "nodemailer";
import { loadSubscriptions, CARRIERS } from "./routes/subscriptions.js";

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export async function sendSmsAlerts(params: {
  title: string;
  message: string;
  city: string;
  expiresAt: string;
}): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) return;

  const subs = loadSubscriptions();
  if (subs.length === 0) return;

  const tz = "America/New_York";
  const expires = new Date(params.expiresAt).toLocaleString("en-US", {
    timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short",
  });

  const body = [
    `TECH WEATHER ALERT`,
    `${params.title}`,
    params.message ? params.message : null,
    `Location: ${params.city}`,
    `Expires: ${expires}`,
    `UNOFFICIAL - Check weather.gov`,
  ].filter(Boolean).join("\n");

  const from = `"Tech Weather" <${process.env.GMAIL_USER}>`;

  const sends = subs.map(async (sub) => {
    const carrier = CARRIERS[sub.carrier];
    if (!carrier) return;
    const to = `${sub.phone}@${carrier.domain}`;
    try {
      await transporter.sendMail({ from, to, subject: params.title, text: body });
    } catch {
      // Non-fatal — one failed send shouldn't stop others
    }
  });

  await Promise.allSettled(sends);
}
