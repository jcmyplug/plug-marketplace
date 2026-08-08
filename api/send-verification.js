/* ─────────────────────────────────────────────────────────────────────────────
   PLUG — email verification code
   Repo location:  api/send-verification.js   (Vercel auto-creates the route)

   The signup flow calls POST /api/send-verification with { email, code }.
   Without this file that call 404s, which is why no verification emails arrive.

   Requires in Vercel → Settings → Environment Variables:
     RESEND_API_KEY   your Resend API key (starts with re_)
     RESEND_FROM      optional, e.g. "PLUG <noreply@my-plug.com>"
                      MUST be on a domain you verified in Resend. The default
                      onboarding@resend.dev only delivers to your own account.
   ───────────────────────────────────────────────────────────────────────────── */

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ error: "Missing email or code" });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[send-verification] RESEND_API_KEY is not set in Vercel env vars");
    return res.status(500).json({ error: "Email service not configured" });
  }

  const FROM = process.env.RESEND_FROM || "PLUG Marketplace <noreply@my-plug.com>";

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F5F5F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F4;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;
                    box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="background:#0A0A0A;padding:22px 28px;">
          <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.02em;">plug</span>
        </td></tr>
        <tr><td style="padding:32px 28px 8px;">
          <h1 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#0A0A0A;">Confirm your email</h1>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#57534E;">
            Enter this code in PLUG to finish creating your account.
          </p>
          <div style="background:#FFF7ED;border:1.5px solid #FDBA74;border-radius:12px;
                      padding:20px;text-align:center;margin-bottom:24px;">
            <div style="font-size:34px;font-weight:800;letter-spacing:0.30em;color:#EA580C;
                        font-family:'SF Mono',Menlo,Consolas,monospace;">${String(code)}</div>
          </div>
          <p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:#57534E;">
            This code expires in 10 minutes.
          </p>
          <p style="margin:0 0 28px;font-size:13px;line-height:1.6;color:#A8A29E;">
            Didn't try to sign up? You can safely ignore this email.
          </p>
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #E7E5E4;">
          <p style="margin:0;font-size:11px;color:#A8A29E;">PLUG Marketplace · Houston, TX</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: `${code} is your PLUG verification code`,
        html,
      }),
    });

    const data = await r.json().catch(() => null);
    if (!r.ok) {
      /* Surface Resend's real reason (unverified domain, bad key, etc.) in the
         Vercel logs so the cause is obvious instead of a silent failure. */
      console.error("[send-verification] Resend rejected:", r.status, data);
      return res.status(502).json({ error: "Email provider rejected the send", detail: data });
    }
    return res.status(200).json({ ok: true, id: data && data.id });
  } catch (err) {
    console.error("[send-verification] exception:", err);
    return res.status(500).json({ error: "Failed to send verification email" });
  }
}
