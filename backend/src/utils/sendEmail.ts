import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

interface PasswordResetEmailParams {
  to: string;
  resetUrl: string;
}

function hasSmtpConfig(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM_EMAIL);
}

export async function sendPasswordResetEmail({ to, resetUrl }: PasswordResetEmailParams): Promise<void> {
  if (!hasSmtpConfig()) {
    // Helpful fallback for local development.
    console.warn(`[dev-only] Reset link for ${to}: ${resetUrl}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: env.SMTP_FROM_EMAIL,
    to,
    subject: 'Reset your password',
    text: `Use this link to reset your password: ${resetUrl}`,
    html: `<p>Use this link to reset your password:</p><p><a href=\"${resetUrl}\">${resetUrl}</a></p>`
  });
}
