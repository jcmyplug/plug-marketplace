/* ─────────────────────────────────────────────────────────────────────────────
   PLUG — booking lifecycle email
   Repo location:  api/send-booking-notification.js   (Vercel auto-creates the route)

   Emails both parties at every stage of a booking:
     requested  — vendor gets a new-request alert; customer gets a "sent" receipt
     confirmed  — vendor approved; both parties get the full confirmed details
     declined   — vendor can't take it
     cancelled  — either party cancelled (48h+ before the event)
     modified   — details changed and need the other party's approval

   Requires RESEND_API_KEY in Vercel env vars. FROM must be on a verified Resend
   domain — onboarding@resend.dev only delivers to your own account (403 otherwise).

   POST body:
   { to, role:"customer"|"vendor",
     status:"requested"|"confirmed"|"declined"|"cancelled"|"modified",
     requestId, vendorName, customerName,
     eventType, eventDate, startTime, endTime, guests, venue,
     serviceName, packageName, packagePrice, accessInstructions, note }
   ───────────────────────────────────────────────────────────────────────────── */

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const b = req.body || {};
  const {
    to, role = "customer", status, requestId,
    vendorName = "the vendor", customerName = "the customer",
    eventType = "", eventDate = "", startTime = "", endTime = "",
    guests = "", venue = "", serviceName = "", packageName = "",
    packagePrice = "", accessInstructions = "", note = "",
  } = b;

  if (!to || !status || !requestId) {
    return res.status(400).json({ error: "Missing to, status or requestId" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Email service not configured" });

  const FROM = process.env.RESEND_FROM || "PLUG Marketplace <noreply@my-plug.com>";
  const isVendor = role === "vendor";

  /* Visual theme + copy per lifecycle stage. */
  const THEME = {
    requested: { badge: "NEW REQUEST", bg: "#EFF6FF", fg: "#1D4ED8" },
    confirmed: { badge: "CONFIRMED",   bg: "#ECFDF5", fg: "#065F46" },
    declined:  { badge: "DECLINED",    bg: "#FEF2F2", fg: "#B91C1C" },
    cancelled: { badge: "CANCELLED",   bg: "#FEF2F2", fg: "#B91C1C" },
    modified:  { badge: "CHANGE REQUEST", bg: "#FFFBEB", fg: "#B45309" },
  }[status] || { badge: String(status || "").toUpperCase(), bg: "#F3F4F6", fg: "#374151" };

  const ev = eventType || "your event";

  const subject = ({
    requested: isVendor ? `New booking request — ${ev} (${requestId})`
                        : `Request sent to ${vendorName} — ${requestId}`,
    confirmed: isVendor ? `You confirmed ${customerName}'s booking — ${requestId}`
                        : `Booking confirmed by ${vendorName} — ${requestId}`,
    declined:  isVendor ? `You declined booking ${requestId}`
                        : `${vendorName} can't take this booking — ${requestId}`,
    cancelled: `Booking cancelled — ${requestId}`,
    modified:  `Booking change requested — ${requestId}`,
  })[status] || `Booking update — ${requestId}`;

  const headline = ({
    requested: isVendor ? `${customerName} wants to book you`
                        : `Your request was sent to ${vendorName}`,
    confirmed: isVendor ? `You confirmed this booking`
                        : `${vendorName} confirmed your booking 🎉`,
    declined:  isVendor ? `You declined this booking`
                        : `${vendorName} can't take this booking`,
    cancelled: isVendor ? `A booking was cancelled`
                        : `Your booking was cancelled`,
    modified:  isVendor ? `${customerName} requested changes`
                        : `Your change request was sent`,
  })[status] || `Booking update`;

  const message = ({
    requested: isVendor ? "Review the details below and approve or decline it in your PLUG dashboard. The customer is waiting to hear back."
                        : `We've sent your request to ${vendorName}. You'll get another email the moment they respond.`,
    confirmed: isVendor ? "This date is now reserved on your calendar. The full event details are below."
                        : "You're all set — the vendor has approved your event. Keep this confirmation number for your records.",
    declined:  isVendor ? "This is your record of the decision."
                        : "You can send a request to another vendor, or message this one about other dates.",
    cancelled: "This booking has been cancelled. Cancellations must be made at least 48 hours before the event.",
    modified:  isVendor ? "The customer changed the details below. Please review and approve or decline the change."
                        : "We've sent your requested changes to the vendor. They'll need to approve them before they take effect.",
  })[status] || "";

  const money = packagePrice !== "" && packagePrice != null
    ? `$${Number(packagePrice).toLocaleString()}` : "";
  const timeRange = [startTime, endTime].filter(Boolean).join(" – ");

  const rows = [
    ["Confirmation #", requestId],
    ["Service", serviceName],
    ["Option", packageName ? `${packageName}${money ? ` — ${money}` : ""}` : ""],
    ["Event", eventType],
    ["Date", eventDate],
    ["Time", timeRange],
    ["Guests", guests],
    ["Location", venue],
    ["Access notes", accessInstructions],
    [isVendor ? "Customer" : "Vendor", isVendor ? customerName : vendorName],
    ["Note", note],
  ].filter(([, v]) => v);

  /* Only confirmed bookings get a mutual-cancellation reminder. */
  const footerNote = status === "confirmed"
    ? "Need to change or cancel? Either party can request it up to 48 hours before the event, and the other side must approve."
    : "";

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject,
        html: `
          <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:540px;margin:0 auto;padding:24px">
            <div style="display:inline-block;padding:5px 12px;border-radius:99px;font-size:12px;font-weight:700;
                        background:${THEME.bg};color:${THEME.fg}">
              ${THEME.badge}
            </div>
            <h2 style="margin:12px 0 6px;font-size:20px;color:#111">${headline}</h2>
            <p style="margin:0 0 18px;color:#555;font-size:14px;line-height:1.6">${message}</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              ${rows.map(([k, v]) => `
                <tr>
                  <td style="padding:8px 0;color:#777;border-top:1px solid #eee;vertical-align:top;white-space:nowrap;padding-right:16px">${k}</td>
                  <td style="padding:8px 0;text-align:right;font-weight:600;border-top:1px solid #eee;color:#111">${v}</td>
                </tr>`).join("")}
            </table>
            ${footerNote ? `<p style="margin:18px 0 0;padding:12px 14px;background:#F9FAFB;border-radius:10px;color:#555;font-size:12px;line-height:1.6">${footerNote}</p>` : ""}
            <p style="margin:22px 0 0;color:#999;font-size:12px">Sent by PLUG · my-plug.com</p>
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
