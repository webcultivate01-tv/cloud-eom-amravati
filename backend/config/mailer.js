const fs = require("fs");
const nodemailer = require("nodemailer");
const { COMPANY, BRAND, LOGO_WHITE } = require("./company");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = () => `"${COMPANY.name}" <${process.env.SMTP_USER}>`;
const SITE = () => process.env.FRONTEND_URL || "http://localhost:5173";

/* ══════════════════════════════════════════════════════════════
   TEMPLATE

   One shell for every message the system sends, so an OTP and a
   dispatch notice arrive looking like the same company wrote them.

   Built for real mail clients rather than for a browser: tables
   instead of flexbox, inline styles only, no web fonts, and the
   logo attached by CID so it renders with images-off blocking
   remote content. Outlook ignores border-radius and drops
   background images, so nothing structural depends on either.
══════════════════════════════════════════════════════════════ */

const LOGO_CID = "cg-logo";

/** The attachment that backs every <img src="cid:cg-logo">. */
const logoAttachment = () =>
  fs.existsSync(LOGO_WHITE)
    ? [{ filename: "cloud-graphics.png", path: LOGO_WHITE, cid: LOGO_CID }]
    : [];

const T = {
  ink:    BRAND.ink,
  muted:  "#64748b",
  faint:  "#94a3b8",
  line:   "#e6edf3",
  paper:  "#f4f7fa",
  brand:  BRAND.primary,
  dark:   BRAND.dark,
  light:  BRAND.light,
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const nl2br = (s) => esc(s).replace(/\n/g, "<br/>");

const money = (n) =>
  `&#8377;${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/** Section heading — small, uppercase, tracked. Used above every block. */
const heading = (text) => `
  <p style="margin:26px 0 10px;font:700 11px/1.2 Arial,Helvetica,sans-serif;color:${T.faint};letter-spacing:1.2px;text-transform:uppercase;">${esc(text)}</p>`;

/** Coloured status/notice panel with a left rule. */
const panel = ({ tone = T.brand, tint = T.light, title, body }) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;">
    <tr>
      <td style="width:4px;background:${tone};"></td>
      <td style="background:${tint};padding:14px 18px;">
        ${title ? `<p style="margin:0 0 4px;font:700 15px/1.35 Arial,Helvetica,sans-serif;color:${tone};">${esc(title)}</p>` : ""}
        <p style="margin:0;font:400 14px/1.6 Arial,Helvetica,sans-serif;color:#475569;">${body}</p>
      </td>
    </tr>
  </table>`;

/** Label/value rows — the workhorse for order and customer details. */
const detailRows = (rows) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    ${rows.filter(Boolean).map(([k, v]) => `
      <tr>
        <td style="padding:7px 0;font:400 13px/1.5 Arial,Helvetica,sans-serif;color:${T.muted};width:40%;border-bottom:1px solid ${T.line};">${esc(k)}</td>
        <td style="padding:7px 0;font:700 13px/1.5 Arial,Helvetica,sans-serif;color:${T.ink};text-align:right;border-bottom:1px solid ${T.line};">${v}</td>
      </tr>`).join("")}
  </table>`;

/** Primary call-to-action. Bulletproof enough for Outlook. */
const button = (label, href) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;">
    <tr><td style="background:${T.brand};">
      <a href="${href}" style="display:inline-block;padding:13px 30px;font:700 14px/1 Arial,Helvetica,sans-serif;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">${esc(label)}</a>
    </td></tr>
  </table>`;

/** The big monospaced code block used by both OTP emails. */
const otpBlock = (otp) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0;">
    <tr><td align="center" style="background:${T.light};border:1px solid ${BRAND.border};padding:26px 20px;">
      <p style="margin:0 0 10px;font:700 11px/1 Arial,Helvetica,sans-serif;color:${T.faint};letter-spacing:1.6px;text-transform:uppercase;">Verification Code</p>
      <p style="margin:0;font:700 38px/1 'Courier New',Courier,monospace;color:${T.dark};letter-spacing:12px;text-indent:12px;">${esc(otp)}</p>
      <p style="margin:12px 0 0;font:400 12px/1.4 Arial,Helvetica,sans-serif;color:${T.muted};">Valid for 10 minutes</p>
    </td></tr>
  </table>`;

/** Delivery charges inside a total = total minus the items' own cost after any coupon discount (0 on older orders). */
const deliveryOf = (items, totalPrice, discount = 0) =>
  Math.max(Math.round((totalPrice - ((items || []).reduce((s, i) => s + i.price * i.quantity, 0) - discount)) * 100) / 100, 0);

/** Line-item table shared by the order, dispatch and delivery mails. A coupon `discount` adds its own line. */
const itemsTable = (items, totalPrice, { discount = 0, couponCode = "" } = {}) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
      <th align="left"   style="padding:0 0 8px;font:700 11px/1 Arial,Helvetica,sans-serif;color:${T.faint};letter-spacing:0.8px;text-transform:uppercase;border-bottom:2px solid ${T.line};">Item</th>
      <th align="center" style="padding:0 0 8px;font:700 11px/1 Arial,Helvetica,sans-serif;color:${T.faint};letter-spacing:0.8px;text-transform:uppercase;border-bottom:2px solid ${T.line};">Qty</th>
      <th align="right"  style="padding:0 0 8px;font:700 11px/1 Arial,Helvetica,sans-serif;color:${T.faint};letter-spacing:0.8px;text-transform:uppercase;border-bottom:2px solid ${T.line};">Amount</th>
    </tr>
    ${(items || []).map((it) => `
      <tr>
        <td style="padding:11px 0;font:400 14px/1.45 Arial,Helvetica,sans-serif;color:${T.ink};border-bottom:1px solid ${T.line};">
          ${esc(it.name)}${it.size ? `<span style="color:${T.faint};font-size:12px;"> &middot; Size ${esc(it.size)}</span>` : ""}
        </td>
        <td align="center" style="padding:11px 0;font:400 14px/1.45 Arial,Helvetica,sans-serif;color:${T.muted};border-bottom:1px solid ${T.line};">${it.quantity}</td>
        <td align="right"  style="padding:11px 0;font:700 14px/1.45 Arial,Helvetica,sans-serif;color:${T.ink};border-bottom:1px solid ${T.line};">${money(it.price * it.quantity)}</td>
      </tr>`).join("")}
    ${totalPrice !== undefined && (discount > 0 || deliveryOf(items, totalPrice, discount) > 0) ? `
      <tr>
        <td colspan="2" style="padding:12px 0 0;font:400 14px/1.4 Arial,Helvetica,sans-serif;color:${T.muted};">Product cost</td>
        <td align="right" style="padding:12px 0 0;font:400 14px/1.4 Arial,Helvetica,sans-serif;color:${T.ink};">${money((items || []).reduce((s, i) => s + i.price * i.quantity, 0))}</td>
      </tr>
      ${discount > 0 ? `
      <tr>
        <td colspan="2" style="padding:6px 0 0;font:400 14px/1.4 Arial,Helvetica,sans-serif;color:${T.muted};">Coupon discount${couponCode ? ` (${esc(couponCode)})` : ""}</td>
        <td align="right" style="padding:6px 0 0;font:400 14px/1.4 Arial,Helvetica,sans-serif;color:#047857;">&minus; ${money(discount)}</td>
      </tr>` : ""}
      <tr>
        <td colspan="2" style="padding:6px 0 0;font:400 14px/1.4 Arial,Helvetica,sans-serif;color:${T.muted};">Delivery charges</td>
        <td align="right" style="padding:6px 0 0;font:400 14px/1.4 Arial,Helvetica,sans-serif;color:${T.ink};">${deliveryOf(items, totalPrice, discount) > 0 ? money(deliveryOf(items, totalPrice, discount)) : "Free"}</td>
      </tr>` : ""}
    ${totalPrice !== undefined ? `
      <tr>
        <td colspan="2" style="padding:14px 0 0;font:700 15px/1.4 Arial,Helvetica,sans-serif;color:${T.ink};">Total</td>
        <td align="right" style="padding:14px 0 0;font:700 19px/1.4 Arial,Helvetica,sans-serif;color:${T.brand};">${money(totalPrice)}</td>
      </tr>` : ""}
  </table>`;

/** Formatted postal address block. */
const addressBlock = (a) => `
  <p style="margin:0;font:400 14px/1.75 Arial,Helvetica,sans-serif;color:#475569;">
    <strong style="color:${T.ink};">${esc(a.fullName)}</strong><br/>
    ${esc(a.phone)}<br/>
    ${esc(a.address)}${a.addressLine2 ? `, ${esc(a.addressLine2)}` : ""}<br/>
    ${a.landmark ? `Near ${esc(a.landmark)}<br/>` : ""}
    ${esc(a.city)}${a.state ? `, ${esc(a.state)}` : ""} &ndash; ${esc(a.pincode)}
  </p>`;

/**
 * Wrap body content in the branded shell.
 * `preheader` is the grey line inbox lists show beside the subject —
 * left empty it leaks whatever markup comes first, so it is always set.
 */
const wrap = ({ preheader = "", eyebrow = "", title, body }) => `
<div style="margin:0;padding:0;background:${T.paper};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${T.paper};padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${T.line};">

        <!-- Brand band -->
        <tr><td style="background:${T.dark};padding:24px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;">
                <img src="cid:${LOGO_CID}" width="86" alt="${esc(COMPANY.name)}" style="display:block;width:86px;height:auto;border:0;" />
              </td>
              <td align="right" style="vertical-align:middle;font:700 15px/1.3 Arial,Helvetica,sans-serif;color:#ffffff;">
                ${esc(COMPANY.name)}
                <span style="display:block;font:400 12px/1.5 Arial,Helvetica,sans-serif;color:#a8d3ea;margin-top:3px;">${esc(COMPANY.website)}</span>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="height:3px;background:${T.brand};font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          ${eyebrow ? `<p style="margin:0 0 6px;font:700 11px/1 Arial,Helvetica,sans-serif;color:${T.brand};letter-spacing:1.4px;text-transform:uppercase;">${esc(eyebrow)}</p>` : ""}
          <h1 style="margin:0 0 18px;font:700 23px/1.3 Arial,Helvetica,sans-serif;color:${T.ink};">${esc(title)}</h1>
          ${body}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#fbfdfe;border-top:1px solid ${T.line};padding:22px 32px;">
          <p style="margin:0 0 8px;font:700 13px/1.4 Arial,Helvetica,sans-serif;color:${T.ink};">${esc(COMPANY.name)}</p>
          <p style="margin:0 0 10px;font:400 12px/1.7 Arial,Helvetica,sans-serif;color:${T.muted};">
            ${esc(COMPANY.address1)}, ${esc(COMPANY.address2)}<br/>
            ${esc(COMPANY.phone)} &nbsp;&middot;&nbsp; <a href="mailto:${esc(COMPANY.email)}" style="color:${T.brand};text-decoration:none;">${esc(COMPANY.email)}</a>
          </p>
          <p style="margin:0;font:400 11px/1.6 Arial,Helvetica,sans-serif;color:${T.faint};">
            &copy; ${new Date().getFullYear()} ${esc(COMPANY.name)}. This is an automated message &mdash; replies reach our support team.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`;

/** Every message goes out through here, so none can forget the logo. */
const send = ({ to, subject, attachments = [], ...content }) =>
  transporter.sendMail({
    from: FROM(),
    to,
    subject,
    html: wrap(content),
    attachments: [...logoAttachment(), ...attachments],
  });

const shortId = (id) => String(id).slice(-8).toUpperCase();

/* Customer-facing order reference for emails — the real order number
   ("2026-0001") once it exists, falling back to a short slice of the
   Mongo ID for orders placed before that field existed. */
const orderRef = (order) => order?.orderNumber || shortId(order?._id ?? order);

/* ══════════════════════════════════════════════════════════════
   ONE-TIME PASSWORDS
══════════════════════════════════════════════════════════════ */

const sendCancelOTP = async ({ toEmail, toName, orderId, orderNumber, otp }) => {
  const ref = orderRef({ _id: orderId, orderNumber });
  await send({
    to: toEmail,
    subject: `${otp} is your cancellation code — Order ${ref}`,
    preheader: `Use code ${otp} to confirm cancelling order ${ref}. Expires in 10 minutes.`,
    eyebrow: "Confirm cancellation",
    title: `Cancel order ${ref}?`,
    body: `
      <p style="margin:0;font:400 15px/1.65 Arial,Helvetica,sans-serif;color:#475569;">
        Hi <strong style="color:${T.ink};">${esc(toName)}</strong>, enter the code below to confirm that you want to cancel this order.
      </p>
      ${otpBlock(otp)}
      <p style="margin:0 0 6px;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:${T.muted};">
        Never share this code with anyone. Our team will never ask you for it.
      </p>
      ${panel({
        tone: "#b45309", tint: "#fffbeb",
        body: `Didn't request this? You can safely ignore this email &mdash; order <strong>${ref}</strong> stays active and nothing will be cancelled.`,
      })}`,
  });
};

const sendPasswordResetOTP = async ({ toEmail, toName, otp }) => {
  await send({
    to: toEmail,
    subject: `${otp} is your password reset code`,
    preheader: `Use code ${otp} to reset your password. Expires in 10 minutes.`,
    eyebrow: "Account security",
    title: "Reset your password",
    body: `
      <p style="margin:0;font:400 15px/1.65 Arial,Helvetica,sans-serif;color:#475569;">
        Hi <strong style="color:${T.ink};">${esc(toName)}</strong>, we received a request to reset the password on your account. Use the code below to set a new one.
      </p>
      ${otpBlock(otp)}
      <p style="margin:0 0 6px;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:${T.muted};">
        Never share this code with anyone. Our team will never ask you for it.
      </p>
      ${panel({
        tone: "#b45309", tint: "#fffbeb",
        body: "Didn't request this? You can safely ignore this email &mdash; your password stays unchanged.",
      })}`,
  });
};

/* ══════════════════════════════════════════════════════════════
   ORDER LIFECYCLE
══════════════════════════════════════════════════════════════ */

const sendOrderConfirmation = async ({ toEmail, toName, order, attachments = [] }) => {
  const ref = orderRef(order);
  const paid = order.paymentStatus === "paid";

  await send({
    to: toEmail,
    subject: `Order ${ref} confirmed — ${COMPANY.name}`,
    preheader: `We've received your order of ${money(order.totalPrice)}. We'll email you as it moves along.`,
    eyebrow: "Order confirmed",
    title: `Thanks, ${esc(toName.split(" ")[0])} — we're on it`,
    attachments,
    body: `
      <p style="margin:0;font:400 15px/1.65 Arial,Helvetica,sans-serif;color:#475569;">
        Your order is confirmed and heading into production. We'll email you each time its status changes.
        ${attachments.length ? " Your tax invoice is attached to this email for your records." : ""}
      </p>

      ${panel({
        tone: BRAND.primary,
        title: `Order ${ref}`,
        body: `Placed on ${new Date(order.createdAt || Date.now()).toLocaleDateString("en-IN", { dateStyle: "long" })}. Keep this reference handy when you contact us.`,
      })}

      ${heading("Items")}
      ${itemsTable(order.items, order.totalPrice, { discount: order.discount, couponCode: order.coupon?.code })}

      ${heading("Payment")}
      ${detailRows([
        ["Method", order.paymentMethod === "razorpay" ? "Paid online" : "Cash on Delivery"],
        ["Status", paid
          ? `<span style="color:#047857;">Paid</span>`
          : `<span style="color:#b45309;">Due on delivery</span>`],
        ["Amount", money(order.totalPrice)],
      ])}

      ${heading("Delivery address")}
      ${addressBlock(order.shippingAddress)}

      ${order.customerNote ? `${heading("Your note")}
        <p style="margin:0;font:400 14px/1.6 Arial,Helvetica,sans-serif;color:#475569;">${nl2br(order.customerNote)}</p>` : ""}

      ${button("Track your order", `${SITE()}/orders`)}`,
  });
};

/* How each status reads to a customer. Every stage carries its own
   colour so the panel matches the news it is delivering. */
const STATUS_INFO = {
  Pending:    { eyebrow: "Order received", tone: "#b45309", tint: "#fffbeb", title: "We've got your order",         text: "It's in the queue and will move into production shortly." },
  Processing: { eyebrow: "In progress",    tone: "#0369a1", tint: "#f0f9ff", title: "Your order is being processed", text: "Our team is preparing your items and checking your artwork." },
  Printing:   { eyebrow: "On the press",   tone: "#7c3aed", tint: "#f5f3ff", title: "Your order is on the press",    text: "Printing has started. Once it's finished we'll pack it for dispatch." },
  "Ready for Delivery": { eyebrow: "Ready", tone: "#0f766e", tint: "#f0fdfa", title: "Your order is ready for delivery", text: "Printing is done and your order is packed, waiting for pickup by our delivery partner." },
  Shipped:    { eyebrow: "Dispatched",     tone: "#0369a1", tint: "#f0f9ff", title: "Your order is on its way",      text: "It's with our courier partner and moving towards you." },
  Delivered:  { eyebrow: "Delivered",      tone: "#047857", tint: "#ecfdf5", title: "Your order has been delivered",  text: "We hope it's everything you wanted. Your tax invoice is attached to this email." },
  Cancelled:  { eyebrow: "Cancelled",      tone: "#b91c1c", tint: "#fef2f2", title: "Your order has been cancelled",  text: "If you paid online, any refund is processed back to your original payment method." },
};

/* The pipeline drawn as a row of steps, so the customer sees where the
   order sits rather than just being told a word. Cancelled orders skip
   it — a progress bar makes no sense for a stopped order. */
const STAGES = ["Pending", "Processing", "Printing", "Ready for Delivery", "Shipped", "Delivered"];

const progressTrack = (status) => {
  const at = STAGES.indexOf(status);
  if (at === -1) return "";
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;border-collapse:collapse;">
    <tr>
      ${STAGES.map((s, i) => {
        const done = i <= at;
        return `<td align="center" style="width:20%;padding:0 2px;">
          <div style="height:4px;background:${done ? T.brand : "#e2e8f0"};font-size:0;line-height:0;">&nbsp;</div>
          <p style="margin:8px 0 0;font:${done ? 700 : 400} 10px/1.3 Arial,Helvetica,sans-serif;color:${done ? T.dark : T.faint};">${s}</p>
        </td>`;
      }).join("")}
    </tr>
  </table>`;
};

/**
 * Sent whenever an admin moves an order to a new status.
 * `attachments` carries the tax invoice on delivery.
 */
const sendOrderStatusUpdate = async ({
  toEmail, toName, orderId, orderNumber, status, totalPrice, discount = 0, couponCode = "", items, attachments = [],
}) => {
  const ref = orderRef({ _id: orderId, orderNumber });
  const info = STATUS_INFO[status] || {
    eyebrow: "Order update", tone: BRAND.primary, tint: T.light,
    title: `Order updated to ${status}`, text: `Your order status is now "${status}".`,
  };

  await send({
    to: toEmail,
    subject: `Order ${ref} — ${status}`,
    preheader: info.text,
    eyebrow: info.eyebrow,
    title: info.title,
    attachments,
    body: `
      <p style="margin:0;font:400 15px/1.65 Arial,Helvetica,sans-serif;color:#475569;">
        Hi <strong style="color:${T.ink};">${esc(toName)}</strong>, here's the latest on order <strong style="color:${T.ink};">${ref}</strong>.
      </p>

      ${panel({ tone: info.tone, tint: info.tint, title: status, body: esc(info.text) })}
      ${progressTrack(status)}

      ${items?.length ? `${heading("Items")}${itemsTable(items, totalPrice, { discount, couponCode })}` : ""}

      ${status === "Delivered" ? `
        ${heading("Your invoice")}
        <p style="margin:0;font:400 14px/1.65 Arial,Helvetica,sans-serif;color:#475569;">
          The tax invoice for this order is attached as a PDF. Please keep it for your records &mdash; you'll need it for any replacement request.
        </p>` : ""}

      ${button("View order details", `${SITE()}/orders`)}`,
  });
};

const sendShipmentEmail = async ({
  toEmail, toName, orderId, orderNumber, items, totalPrice, discount = 0, couponCode = "", trackingId, courierName, shippingAddress,
}) => {
  const ref = orderRef({ _id: orderId, orderNumber });
  const trackingUrl = trackingId ? `https://shiprocket.co/tracking/${trackingId}` : null;

  await send({
    to: toEmail,
    subject: `Order ${ref} has been dispatched`,
    preheader: trackingId
      ? `Tracking number ${trackingId}${courierName ? ` via ${courierName}` : ""}.`
      : "Your order is on its way.",
    eyebrow: "Dispatched",
    title: "Your order is on its way",
    body: `
      <p style="margin:0;font:400 15px/1.65 Arial,Helvetica,sans-serif;color:#475569;">
        Hi <strong style="color:${T.ink};">${esc(toName)}</strong>, order <strong style="color:${T.ink};">${ref}</strong> has been handed to our courier partner.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;">
        <tr><td align="center" style="background:${T.light};border:1px solid ${BRAND.border};padding:24px 20px;">
          <p style="margin:0 0 8px;font:700 11px/1 Arial,Helvetica,sans-serif;color:${T.faint};letter-spacing:1.4px;text-transform:uppercase;">Tracking Number</p>
          <p style="margin:0;font:700 24px/1.2 'Courier New',Courier,monospace;color:${T.dark};letter-spacing:3px;">${esc(trackingId || "Assigning…")}</p>
          ${courierName ? `<p style="margin:10px 0 0;font:400 13px/1.4 Arial,Helvetica,sans-serif;color:${T.muted};">via ${esc(courierName)}</p>` : ""}
        </td></tr>
      </table>

      ${trackingUrl ? button("Track this shipment", trackingUrl) : ""}

      ${heading("Delivering to")}
      ${addressBlock(shippingAddress)}

      ${heading("Items in this shipment")}
      ${itemsTable(items, totalPrice, { discount, couponCode })}

      <p style="margin:22px 0 0;font:400 13px/1.65 Arial,Helvetica,sans-serif;color:${T.muted};">
        Most deliveries arrive within 3&ndash;7 business days. Tracking updates begin once the courier scans the parcel at pickup.
      </p>`,
  });
};

/* ══════════════════════════════════════════════════════════════
   ENQUIRIES
══════════════════════════════════════════════════════════════ */

const sendInquiryToAdmin = async ({ name, email, phone, subject, message }) => {
  await send({
    to: process.env.SMTP_USER,
    subject: `New enquiry: ${subject || "General"} — ${name}`,
    preheader: `${name} (${email}) sent an enquiry.`,
    eyebrow: "Admin notification",
    title: "New enquiry received",
    body: `
      ${detailRows([
        ["Name", esc(name)],
        ["Email", `<a href="mailto:${esc(email)}" style="color:${T.brand};text-decoration:none;">${esc(email)}</a>`],
        ["Phone", esc(phone || "—")],
        ["Subject", esc(subject || "—")],
      ])}

      ${heading("Message")}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:4px;background:${T.brand};"></td>
          <td style="background:${T.light};padding:14px 18px;font:400 14px/1.7 Arial,Helvetica,sans-serif;color:#475569;">
            ${message ? nl2br(message) : `<em style="color:${T.faint};">No message provided.</em>`}
          </td>
        </tr>
      </table>

      ${button("Open in admin panel", `${SITE()}/admin/inquiries`)}`,
  });
};

const sendInquiryConfirmationToUser = async ({ toEmail, toName, subject }) => {
  await send({
    to: toEmail,
    subject: `We've received your enquiry — ${COMPANY.name}`,
    preheader: "Our team will get back to you within 24–48 business hours.",
    eyebrow: "Enquiry received",
    title: "Thanks for getting in touch",
    body: `
      <p style="margin:0;font:400 15px/1.65 Arial,Helvetica,sans-serif;color:#475569;">
        Hi <strong style="color:${T.ink};">${esc(toName)}</strong>, we've received your enquiry and it's with our team now.
      </p>

      ${panel({
        tone: "#047857", tint: "#ecfdf5",
        title: "What happens next",
        body: "We usually reply within <strong>24&ndash;48 hours</strong> on business days. If it's urgent, call us and we'll help straight away.",
      })}

      ${detailRows([["Your subject", esc(subject || "—")]])}

      <p style="margin:22px 0 0;font:400 14px/1.65 Arial,Helvetica,sans-serif;color:#475569;">
        Reach us on <strong style="color:${T.ink};">${esc(COMPANY.phone)}</strong> for anything time-sensitive.
      </p>`,
  });
};

const sendInquiryResponseToUser = async ({ toEmail, toName, subject, adminResponse }) => {
  await send({
    to: toEmail,
    subject: `Re: ${subject} — ${COMPANY.name}`,
    preheader: "Our team has replied to your enquiry.",
    eyebrow: "Reply from our team",
    title: "We've answered your enquiry",
    body: `
      <p style="margin:0;font:400 15px/1.65 Arial,Helvetica,sans-serif;color:#475569;">
        Hi <strong style="color:${T.ink};">${esc(toName)}</strong>, thanks for your patience. Here's our reply about
        <strong style="color:${T.ink};">"${esc(subject)}"</strong>.
      </p>

      ${heading("Our response")}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:4px;background:${T.brand};"></td>
          <td style="background:${T.light};padding:16px 18px;font:400 15px/1.75 Arial,Helvetica,sans-serif;color:${T.ink};">
            ${nl2br(adminResponse)}
          </td>
        </tr>
      </table>

      <p style="margin:22px 0 0;font:400 14px/1.65 Arial,Helvetica,sans-serif;color:#475569;">
        Still need help? Just reply to this email and it comes straight back to us.
      </p>`,
  });
};

/* ══════════════════════════════════════════════════════════════
   REPLACEMENTS
══════════════════════════════════════════════════════════════ */

const REPLACEMENT_INFO = {
  approved:   { tone: "#047857", tint: "#ecfdf5", title: "Replacement approved",  text: "We've approved your replacement request and will process it shortly." },
  rejected:   { tone: "#b91c1c", tint: "#fef2f2", title: "Replacement declined",  text: "We weren't able to approve this replacement request. The reason is below." },
  processing: { tone: "#0369a1", tint: "#f0f9ff", title: "Replacement in progress", text: "Your replacement is being prepared by our team right now." },
  completed:  { tone: "#047857", tint: "#ecfdf5", title: "Replacement dispatched", text: "Your replacement has been completed and sent out. Thanks for your patience." },
};

const sendReplacementStatusUpdate = async ({ toEmail, toName, productName, status, adminResponse }) => {
  const info = REPLACEMENT_INFO[status] || {
    tone: BRAND.primary, tint: T.light,
    title: `Replacement ${status}`, text: `Your replacement request is now "${status}".`,
  };

  await send({
    to: toEmail,
    subject: `Replacement request ${status} — ${COMPANY.name}`,
    preheader: info.text,
    eyebrow: "Replacement update",
    title: info.title,
    body: `
      <p style="margin:0;font:400 15px/1.65 Arial,Helvetica,sans-serif;color:#475569;">
        Hi <strong style="color:${T.ink};">${esc(toName)}</strong>, here's an update on your replacement request.
      </p>

      ${panel({ tone: info.tone, tint: info.tint, title: status.charAt(0).toUpperCase() + status.slice(1), body: esc(info.text) })}

      ${detailRows([["Product", esc(productName)]])}

      ${adminResponse ? `${heading("Message from our team")}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:4px;background:${T.brand};"></td>
            <td style="background:${T.light};padding:14px 18px;font:400 14px/1.7 Arial,Helvetica,sans-serif;color:#475569;">${nl2br(adminResponse)}</td>
          </tr>
        </table>` : ""}

      ${button("View my replacements", `${SITE()}/replacements`)}`,
  });
};

/* ══════════════════════════════════════════════════════════════
   STAFF ACCOUNTS
══════════════════════════════════════════════════════════════ */

/**
 * Hands a new (or reset) employee their sign-in details.
 *
 * The password is temporary by design: the panel will not open until they
 * replace it, so putting it in the mail is the handover, not a standing
 * credential. Sent on account creation and whenever an admin resets it.
 */
const sendEmployeeCredentials = async ({ toEmail, toName, password, employeeRole, modules = [], isReset = false }) => {
  const roleLabel = "Manager";
  await send({
    to: toEmail,
    subject: isReset
      ? `Your ${COMPANY.name} staff password has been reset`
      : `Your ${COMPANY.name} staff account is ready`,
    preheader: isReset
      ? "A new temporary password has been set for your staff account."
      : "Sign in with the temporary password below and choose your own.",
    eyebrow: "Staff access",
    title: isReset ? "Your password has been reset" : `Welcome to the ${COMPANY.name} team`,
    body: `
      <p style="margin:0;font:400 15px/1.65 Arial,Helvetica,sans-serif;color:#475569;">
        Hi <strong style="color:${T.ink};">${esc(toName)}</strong>, ${isReset
          ? "an administrator has set a new temporary password on your staff account."
          : `an administrator has created a staff account for you as <strong style="color:${T.ink};">${esc(roleLabel)}</strong>.`}
      </p>

      ${heading("Your sign-in details")}
      ${detailRows([
        ["Email", esc(toEmail)],
        ["Temporary password", `<span style="font-family:'Courier New',Courier,monospace;letter-spacing:1px;">${esc(password)}</span>`],
      ])}

      ${panel({
        tone: "#b45309", tint: "#fffbeb",
        title: "Change it on first sign-in",
        body: "This password is temporary. You will be asked to choose your own before the staff panel opens, and this one stops working from then on.",
      })}

      ${modules.length ? `
        ${heading("Sections you can access")}
        <p style="margin:0;font:400 14px/1.75 Arial,Helvetica,sans-serif;color:#475569;">
          ${modules.map((m) => esc(m)).join(" &middot; ")}
        </p>` : ""}

      ${button("Sign in to the staff panel", `${SITE()}/login`)}

      <p style="margin:0;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:${T.muted};">
        Keep these details private. If you did not expect this email, tell your administrator straight away.
      </p>`,
  });
};

module.exports = {
  sendCancelOTP,
  sendEmployeeCredentials,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendShipmentEmail,
  sendInquiryToAdmin,
  sendInquiryConfirmationToUser,
  sendInquiryResponseToUser,
  sendReplacementStatusUpdate,
  sendPasswordResetOTP,
  // exported for the template preview harness
  __templates: { wrap, panel, itemsTable, otpBlock, progressTrack },
};
