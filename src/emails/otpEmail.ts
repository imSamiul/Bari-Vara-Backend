import { env } from '../config/env.js';

interface OtpEmail {
  subject: string;
  html: string;
  text: string;
}

const BRAND_COLOR = '#0f766e';

/**
 * Inline styles and a table-free single column, because Outlook and Gmail strip
 * <style> blocks and most flexbox properties.
 */
function renderOtpTemplate(options: {
  heading: string;
  intro: string;
  otp: string;
  footnote: string;
}) {
  const minutes = Math.round(env.OTP_TTL_SECONDS / 60);

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <p style="margin:0 0 24px;font-size:18px;font-weight:700;color:${BRAND_COLOR};">Bari Vara</p>
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">${escapeHtml(options.heading)}</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">${escapeHtml(options.intro)}</p>
      <p style="margin:0 0 24px;font-size:34px;letter-spacing:10px;font-weight:700;text-align:center;background:#f4f4f5;border-radius:8px;padding:18px 0;">${options.otp}</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#52525b;">This code expires in ${minutes} minutes.</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#52525b;">${escapeHtml(options.footnote)}</p>
    </div>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildVerificationEmail(name: string, otp: string): OtpEmail {
  const heading = `Welcome, ${name}`;
  const intro = 'Enter this code to verify your email and finish signing up.';
  const footnote =
    'If you did not create a Bari Vara account, you can ignore this email.';

  return {
    subject: `${otp} is your Bari Vara verification code`,
    html: renderOtpTemplate({ heading, intro, otp, footnote }),
    text: `${heading}\n\n${intro}\n\n${otp}\n\n${footnote}`,
  };
}

export function buildPasswordResetEmail(name: string, otp: string): OtpEmail {
  const heading = `Reset your password, ${name}`;
  const intro = 'Enter this code to choose a new password.';
  const footnote =
    'If you did not ask to reset your password, ignore this email and your password stays unchanged.';

  return {
    subject: `${otp} is your Bari Vara password reset code`,
    html: renderOtpTemplate({ heading, intro, otp, footnote }),
    text: `${heading}\n\n${intro}\n\n${otp}\n\n${footnote}`,
  };
}
