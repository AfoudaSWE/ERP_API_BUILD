import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!env.SMTP_USER || !env.SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendMail(input: { to: string; subject: string; html: string }) {
  const client = getTransporter();
  if (!client) {
    console.warn(`[mailer] SMTP not configured, skipping email to ${input.to}: ${input.subject}`);
    return;
  }
  try {
    await client.sendMail({
      from: env.MAIL_FROM || env.SMTP_USER,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
  } catch (error) {
    console.error('[mailer] Failed to send email', error);
  }
}
