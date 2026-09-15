import nodemailer from 'nodemailer';

import { env } from './env.js';

/**
 * Without SMTP credentials the transport serialises the message instead of
 * sending it. In development/test the message body (including the OTP) is
 * always printed so local signup works even when Gmail SMTP is configured.
 */
const hasSmtpCredentials = Boolean(
  env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD,
);

const transporter = hasSmtpCredentials
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    })
  : nodemailer.createTransport({ jsonTransport: true });

export async function sendMail(message: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  await transporter.sendMail({ from: env.MAIL_FROM, ...message });

  if (env.NODE_ENV !== 'production') {
    const via = hasSmtpCredentials ? 'SMTP' : 'JSON transport (no SMTP)';
    console.info(`[mail:${via}] to ${message.to}\n${message.text}`);
  }
}
