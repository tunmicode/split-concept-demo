const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendVerificationCode({ email, code }) {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your_resend_api_key') {
    console.warn('RESEND_API_KEY missing; skipping email send. Verification code:', code);
    return { skipped: true };
  }

  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  await resend.emails.send({
    from,
    to: email,
    subject: 'Your Split verification code',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #111812;">
        <h2>Your verification code</h2>
        <p>Use the code below to verify your Split account.</p>
        <div style="font-size: 32px; letter-spacing: 6px; font-weight: 700; margin: 20px 0;">${code}</div>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  });

  return { skipped: false };
}

module.exports = { sendVerificationCode };
