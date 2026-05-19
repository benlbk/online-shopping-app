import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

type EmailParams = {
  email: string;
  token: string;
  name: string;
};

export async function sendVerificationEmail({ email, token, name }: EmailParams) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify?token=${token}`;

  await resend.emails.send({
    from: 'noreply@example.com',
    to: email,
    subject: 'Verify your email address',
    html: `
      <h1>Welcome ${name}!</h1>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
    `
  });
}

export async function sendPasswordResetEmail({ email, token, name }: EmailParams) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

  await resend.emails.send({
    from: 'noreply@example.com',
    to: email,
    subject: 'Reset your password',
    html: `
      <h1>Hello ${name}</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  });
}
