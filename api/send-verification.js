/**
 * /api/send-verification.js
 *
 * Vercel serverless function that emails a 6-digit verification code via Resend.
 *
 * Called by the React app's signup flow after a code has been generated and
 * stored in Supabase's verify_codes table.
 *
 * Required environment variable (set in Vercel → Settings → Environment Variables):
 *   RESEND_API_KEY — your Resend API key (Sensitive)
 *
 * Expected POST body: { email: string, code: string }
 */

export default async function handler(req, res) {
  /* Only accept POST */
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  /* Validate input */
  const { email, code } = req.body || {};
  if (!email || !code) {
    return res.status(400).json({ error: "Missing email or code" });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }
  if (!/^\d{6}$/.test(String(code))) {
    return res.status(400).json({ error: "Code must be 6 digits" });
  }

  /* Guard against missing key (prevents confusing 500s) */
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set in environment");
    return res.status(500).json({ error: "Email service not configured" });
  }

  /* Build the email */
  const subject = "Your PLUG verification code";
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="margin:0; padding:0; background:#F9FAFB; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <div style="max-width:480px; margin:0 auto; padding:32px 24px; background:#FFFFFF;">
          <div style="text-align:center; margin-bottom:24px;">
            <div style="font-size:24px; font-weight:800; color:#FF5C28; letter-spacing:0.05em;">PLUG</div>
            <div style="font-size:11px; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.15em; margin-top:4px;">Houston Event Marketplace</div>
          </div>

          <h1 style="color:#111827; font-size:22px; font-weight:800; margin:0 0 12px; text-align:center;">Verify your email</h1>

          <p style="color:#4B5563; font-size:14px; line-height:1.65; margin:0 0 24px; text-align:center;">
            Thanks for signing up with PLUG! Enter this code in the app to finish creating your account.
          </p>

          <div style="background:#FFF7ED; border:1px solid #FED7AA; border-radius:14px; padding:24px; text-align:center; margin:0 0 24px;">
            <div style="font-size:36px; font-weight:800; letter-spacing:0.22em; color:#FF5C28; font-family:'SF Mono',Menlo,Consolas,monospace;">${code}</div>
          </div>

          <p style="color:#6B7280; font-size:13px; line-height:1.65; margin:0 0 24px; text-align:center;">
            This code expires in 15 minutes.<br/>
            If you didn't sign up for PLUG, you can safely ignore this email.
          </p>

          <hr style="border:none; border-top:1px solid #E5E7EB; margin:24px 0;">

          <p style="color:#9CA3AF; font-size:11px; line-height:1.5; margin:0; text-align:center;">
            PLUG Marketplace · Houston, TX<br/>
            <a href="https://www.my-plug.com" style="color:#9CA3AF; text-decoration:underline;">my-plug.com</a>
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `PLUG — Verify your email

Thanks for signing up with PLUG! Enter this code in the app to finish creating your account:

${code}

This code expires in 15 minutes.
If you didn't sign up for PLUG, you can safely ignore this email.

PLUG Marketplace · Houston, TX
https://www.my-plug.com`;

  /* Send via Resend API */
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "PLUG Marketplace <noreply@my-plug.com>",
        to: [email],
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Resend API error:", response.status, errorBody);
      return res.status(502).json({
        error: "Email send failed",
        detail: errorBody.slice(0, 500),
      });
    }

    const data = await response.json();
    return res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    console.error("Send verification exception:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}
