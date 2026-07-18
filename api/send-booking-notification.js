/* ─────────────────────────────────────────────────────────────────────────────
   PLUG — booking status email
   Repo location:  api/send-booking-notification.js   (Vercel auto-creates the route)

   Sends "your booking was approved / declined" to the customer, and a copy of
   the decision to the vendor. Requires RESEND_API_KEY in Vercel env vars.

   POST body:
   { to, role: "customer"|"vendor", status: "confirmed"|"declined",
     requestId, vendorName, eventType, eventDate, guests, venue }
   ───────────────────────────────────────────────────────────────────────────── */

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { to, role = "customer", status, requestId,
          vendorName = "the vendor", eventType = "your event",
          eventDate = "", guests = "", venue = "" } = req.body || {};

  if (!to || !status || !requestId) {
    return res.status(400).json({ error: "Missing to, status or requestId" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Email service not configured" });

  const FROM = process.env.RESEND_FROM || "PLUG <onboarding@resend.dev>";
  const approved = status === "confirmed" || status === "accepted";

  const subject = role === "vendor"
    ? `You ${approved ? "accepted" : "declined"} booking ${requestId}`
    : `${approved ? "Booking confirmed" : "Booking declined"} — ${requestId}`;

  const headline = role === "vendor"
    ? `You ${approved ? "accepted" : "declined"} this booking`
    : (approved
        ? `${vendorName} confirmed your booking`
        : `${vendorName} can't take this booking`);

  const note = role === "vendor"
    ? "This is your record of the decision."
    : (approved
        ? "You're all set. Keep this confirmation number for your records."
        : "You can send a request to another vendor, or message this vendor to ask about other dates.");

  const rows = [
    ["Confirmation #", requestId],
    ["Event", eventType],
    ["Date", eventDate],
    ["Guests", guests],
    ["Location", venue],
    ["Vendor", vendorName],
  ].filter(([, v]) => v);

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject,
        html: `
          <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px">
            <div style="display:inline-block;padding:5px 12px;border-radius:99px;font-size:12px;font-weight:700;
                        background:${approved ? "#ECFDF5" : "#FEF2F2"};color:${approved ? "#065F46" : "#B91C1C"}">
              ${approved ? "CONFIRMED" : "DECLINED"}
            </div>
            <h2 style="margin:12px 0 6px;font-size:20px">${headline}</h2>
            <p style="margin:0 0 18px;color:#555;font-size:14px;line-height:1.6">${note}</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              ${rows.map(([k, v]) => `
                <tr>
                  <td style="padding:8px 0;color:#777;border-top:1px solid #eee">${k}</td>
                  <td style="padding:8px 0;text-align:right;font-weight:600;border-top:1px solid #eee">${v}</td>
                </tr>`).join("")}
            </table>
            <p style="margin:22px 0 0;color:#999;font-size:12px">
              Sent by PLUG · my-plug.com
            </p>
          </div>`,
      }),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("[send-booking-notification] Resend error:", r.status, data);
      return res.status(502).json({ error: "Could not send email", detail: data });
    }
    return res.status(200).json({ ok: true, id: data.id });
  } catch (err) {
    console.error("[send-booking-notification] exception:", err);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
