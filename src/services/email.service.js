const { Resend } = require('resend');

const apiKey = process.env.RESEND_API_KEY;
const hasRealApiKey = Boolean(apiKey && apiKey.trim() && apiKey !== 'your_resend_api_key' && apiKey !== 'demo-key');
const resend = hasRealApiKey ? new Resend(apiKey) : null;

async function sendVerificationCode({ email, code }) {
  if (!hasRealApiKey) {
    console.warn(`RESEND_API_KEY missing or demo mode. Verification code for ${email}: ${code}`);
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
