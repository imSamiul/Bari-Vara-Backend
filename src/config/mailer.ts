import nodemailer from 'nodemailer';

import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Without SMTP credentials the transport serialises the message instead of
 * sending it, so a fresh clone can run the OTP flow with the code read from the
 * API log. Production validation in env.ts guarantees real credentials there.
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
  const info = await transporter.sendMail({ from: env.MAIL_FROM, ...message });

  if (hasSmtpCredentials) {
    logger.debug({ to: message.to, subject: message.subject }, 'Email sent');
    return;
  }

  logger.info(
    { to: message.to, subject: message.subject, body: message.text },
    'Email not sent: no SMTP credentials configured. Body logged instead.',
  );
  logger.debug(
    { messageId: info.messageId },
    'Email captured by jsonTransport',
  );
}
