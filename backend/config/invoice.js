const fs = require("fs");
const QRCode = require("qrcode");
const PDFDocument = require("pdfkit");
const {
  COMPANY, BANK, LOGO_DARK, SIGNATURE, round2, splitGst,
} = require("./company");

/* ══════════════════════════════════════════════════════════════
   BILL OF SUPPLY

   One A4 page in a gold frame: company masthead -> invoice no. and
   date -> Bill To -> items table with a subtotal row -> bank details
   and UPI QR on the left, totals and signature on the right.

   Catalogue prices are what the customer is charged, so the bill
   states them as they are — the total always matches the order to
   the paisa. `buildInvoiceModel` still carries the GST split for the
   admin summary and reports; it just isn't printed here.
══════════════════════════════════════════════════════════════ */

const MARGIN = 44;
const GOLD = "#d4b25a";
const CREAM = "#f9f3e3";
const INK = "#1f2937";
const MUTED = "#6b7280";
const NAVY = "#25395a";

/** "22/09/2026" — date only. Invoices carry no time of day. */
const invoiceDate = (d) =>
  new Date(d || Date.now()).toLocaleDateString("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

/**
 * Indian financial year label for a date — 1 Apr to 31 Mar.
 * Invoice numbers restart each year, so this keys the counter.
 */
const financialYear = (d = new Date()) => {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const start = dt.getMonth() >= 3 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
};

/** "CG/2026-27/0042" */
const formatInvoiceNumber = (seq, date) =>
  `CG/${financialYear(date)}/${String(seq).padStart(4, "0")}`;

/* ── Amount in words (Indian grouping: lakh, crore) ─────────── */

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const below1000 = (n) => {
  const parts = [];
  if (n >= 100) { parts.push(`${ONES[Math.floor(n / 100)]} Hundred`); n %= 100; }
  if (n >= 20) { parts.push(TENS[Math.floor(n / 10)]); n %= 10; }
  if (n > 0) parts.push(ONES[n]);
  return parts.join(" ");
};

/** 1250 -> "One Thousand Two Hundred Fifty Rupees"; 99.5 -> "... Rupees and Fifty Paise" */
const amountInWords = (amount) => {
  const total = round2(amount);
  let rupees = Math.floor(total);
  const paise = Math.round((total - rupees) * 100);

  const words = [];
  [[10000000, "Crore"], [100000, "Lakh"], [1000, "Thousand"]].forEach(([unit, name]) => {
    if (rupees >= unit) { words.push(`${below1000(Math.floor(rupees / unit))} ${name}`); rupees %= unit; }
  });
  if (rupees > 0) words.push(below1000(rupees));

  let out = `${words.join(" ") || "Zero"} Rupees`;
  if (paise > 0) out += ` and ${below1000(paise)} Paise`;
  return out;
};

/** "1,250" or "1,250.50" — whole rupees print without decimals, like the reference bill. */
const money = (n) => {
  const v = round2(n);
  return v.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

/* ── Drawing helpers ─────────────────────────────────────────── */

const hline = (doc, x1, x2, y, color = GOLD, width = 1) =>
  doc.save().lineWidth(width).strokeColor(color).moveTo(x1, y).lineTo(x2, y).stroke().restore();

/** Gold double frame around the page. */
const drawFrame = (doc) => {
  const { width: W, height: H } = doc.page;
  doc.save().lineWidth(1.6).strokeColor(GOLD).rect(20, 20, W - 40, H - 40).stroke().restore();
  doc.save().lineWidth(0.4).strokeColor(GOLD).rect(25, 25, W - 50, H - 50).stroke().restore();
};

/** Bold label then regular value on one line, starting at x. */
const labelValue = (doc, label, value, x, y, { size = 9, gap = 4 } = {}) => {
  doc.font("Helvetica-Bold").fontSize(size);
  const w = doc.widthOfString(label);
  doc.fillColor(INK).text(label, x, y, { lineBreak: false });
  doc.font("Helvetica").fillColor(MUTED).text(value, x + w + gap, y, { lineBreak: false });
};

/** Masthead: logo and company details left, "BILL OF SUPPLY" tag right. */
const drawHeader = (doc) => {
  const W = doc.page.width;
  const right = W - MARGIN;

  if (fs.existsSync(LOGO_DARK)) doc.image(LOGO_DARK, MARGIN, 46, { fit: [112, 84] });

  const tx = MARGIN + 130;
  doc.font("Times-Bold").fontSize(22).fillColor(INK)
     .text("CLOUD GRAPHICS.in", tx, 48, { lineBreak: false });

  labelValue(doc, "Pan No", COMPANY.pan, tx, 78);
  labelValue(doc, "Phone:", COMPANY.phone, tx, 96);
  labelValue(doc, "Email:", COMPANY.email, tx + 120, 96);

  doc.font("Helvetica").fontSize(8.5).fillColor(MUTED)
     .text(`${COMPANY.address1}, ${COMPANY.address2}`, tx, 114, { width: right - tx });
  labelValue(doc, "Website:", COMPANY.website, tx, 138, { size: 8.5 });

  doc.font("Helvetica-Bold").fontSize(10).fillColor(NAVY)
     .text("BILL OF SUPPLY", MARGIN, 50, { width: right - MARGIN, align: "right" });
  const tagW = 104;
  doc.save().lineWidth(0.5).strokeColor(MUTED)
     .roundedRect(right - tagW, 66, tagW, 14, 2).stroke().restore();
  doc.font("Helvetica").fontSize(5.5).fillColor(MUTED)
     .text("ORIGINAL FOR RECIPIENT", right - tagW, 71, { width: tagW, align: "center", characterSpacing: 0.2 });

  const bottom = 162;
  hline(doc, 25, W - 25, bottom, GOLD, 1);
  return bottom;
};

const drawMeta = (doc, top, { invoiceNumber, date }) => {
  const W = doc.page.width;
  const y = top + 14;
  [["Invoice No.", invoiceNumber, MARGIN], ["Invoice Date", invoiceDate(date), MARGIN + 150]].forEach(([k, v, x]) => {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(INK).text(k, x, y, { lineBreak: false });
    doc.font("Helvetica").fontSize(9.5).fillColor(MUTED).text(v, x, y + 14, { lineBreak: false });
  });
  const bottom = y + 42;
  hline(doc, 25, W - 25, bottom, GOLD, 1);
  return bottom;
};

const drawBillTo = (doc, top, { name, phone, address }) => {
  const W = doc.page.width;
  let y = top + 14;
  doc.font("Helvetica-Bold").fontSize(10).fillColor(NAVY).text("Bill To", MARGIN, y, { lineBreak: false });
  y += 16;
  doc.font("Helvetica").fontSize(11).fillColor(INK).text(name, MARGIN, y, { width: W - MARGIN * 2 });
  y = doc.y + 2;
  labelValue(doc, "Mobile", phone, MARGIN, y, { size: 9 });
  y += 14;
  if (address && address !== "—") {
    doc.font("Helvetica").fontSize(8.5).fillColor(MUTED).text(address, MARGIN, y, { width: W - MARGIN * 2 - 60 });
    y = doc.y;
  }
  return y + 12;
};

/* Description takes the slack; the numeric columns are fixed so figures line up. */
const itemColumns = (w) => {
  const cols = [
    { key: "no",    label: "No",             w: 44,  align: "center" },
    { key: "title", label: "ITEMS/SERVICES", w: w - 44 - 70 - 70 - 90, align: "left" },
    { key: "qty",   label: "Qty.",           w: 70,  align: "right" },
    { key: "rate",  label: "Rate",           w: 70,  align: "right" },
    { key: "total", label: "Total",          w: 90,  align: "right" },
  ];
  let cx = MARGIN;
  cols.forEach((c) => { c.x = cx; cx += c.w; });
  return cols;
};

const FOOTER_H = 236; // bank/QR + totals + signature, kept together on one page

const drawItems = (doc, top, { items, itemsTotal }) => {
  const W = doc.page.width;
  const H = doc.page.height;
  const w = W - MARGIN * 2;
  const cols = itemColumns(w);
  const cell = (col, text, y, opts = {}) =>
    doc.text(String(text), col.x + 8, y, { width: col.w - 16, align: col.align, ...opts });

  const drawHead = (y) => {
    doc.save().rect(MARGIN, y, w, 26).fill(CREAM).restore();
    doc.font("Helvetica").fontSize(9).fillColor(INK);
    cols.forEach((c) => cell(c, c.label, y + 9));
    return y + 26;
  };

  let y = drawHead(top);
  const bodyStart = y;

  items.forEach((it, i) => {
    doc.font("Helvetica").fontSize(9.5);
    const titleH = doc.heightOfString(it.title, { width: cols[1].w - 16 });
    const subH = it.sub ? 11 : 0;
    const h = Math.max(titleH + subH + 20, 34);

    // Leave room for the footer on the last page; otherwise continue on a fresh one.
    if (y + h > H - 60 - (i === items.length - 1 ? FOOTER_H : 0)) {
      doc.addPage();
      drawFrame(doc);
      y = drawHead(50);
    }

    doc.font("Helvetica").fontSize(9.5).fillColor(INK);
    cell(cols[0], i + 1, y + 10);
    cell(cols[1], it.title, y + 10);
    if (it.sub) {
      doc.font("Helvetica").fontSize(7.5).fillColor(MUTED);
      cell(cols[1], it.sub, y + 10 + titleH + 1);
    }
    doc.font("Helvetica").fontSize(9.5).fillColor(INK);
    cell(cols[2], `${it.qty} ${it.unit}`, y + 10);
    cell(cols[3], money(it.rate), y + 10);
    cell(cols[4], money(it.amount), y + 10);
    y += h;
  });

  // Keep a little breathing room under short orders, like the reference bill.
  y = Math.max(y, bodyStart + 170);

  doc.save().rect(MARGIN, y, w, 26).fill(CREAM).restore();
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK);
  cell(cols[1], "SUBTOTAL", y + 8);
  cell(cols[2], items.reduce((n, it) => n + Number(it.qty), 0), y + 8);
  cell(cols[4], `Rs. ${money(itemsTotal)}`, y + 8);
  return y + 26;
};

const drawFooter = async (doc, top, model) => {
  const W = doc.page.width;
  const H = doc.page.height;
  const right = W - MARGIN;
  const { totals, received, itemsTotal, deliveryCharge } = model;

  if (top + FOOTER_H > H - 40) { doc.addPage(); drawFrame(doc); top = 50; }

  /* Left — bank details and payment QR */
  let y = top + 18;
  doc.font("Helvetica").fontSize(9).fillColor(MUTED).text("Bank Details", MARGIN, y, { lineBreak: false });
  y += 17;
  [["Name", BANK.holder], ["IFSC", BANK.ifsc], ["Account No", BANK.account], ["Bank Name", BANK.bank]].forEach(([k, v]) => {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(INK).text(k, MARGIN, y, { lineBreak: false });
    doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(v, MARGIN + 70, y, { lineBreak: false });
    y += 15;
  });

  const balance = round2(totals.gross - received);
  const upi = `upi://pay?pa=${BANK.upiId}&pn=${encodeURIComponent(COMPANY.legalName)}&cu=INR` +
    (balance > 0 ? `&am=${balance.toFixed(2)}` : "");
  const qr = await QRCode.toBuffer(upi, { margin: 0, width: 220 });

  const qrTop = y + 10;
  doc.save().lineWidth(0.7).strokeColor(GOLD).roundedRect(MARGIN, qrTop, 220, 66, 6).stroke().restore();
  doc.image(qr, MARGIN + 10, qrTop + 8, { width: 50, height: 50 });
  doc.font("Helvetica-Bold").fontSize(9).fillColor(INK).text("Payment QR Code", MARGIN + 72, qrTop + 14, { lineBreak: false });
  doc.font("Helvetica").fontSize(8).fillColor(MUTED)
     .text("PhonePe · GPay · Paytm · UPI", MARGIN + 72, qrTop + 28, { lineBreak: false });
  labelValue(doc, "UPI ID:", BANK.upiId, MARGIN + 72, qrTop + 42, { size: 8 });

  /* Right — totals, amount in words, signature */
  const rx = 300;
  hline(doc, rx, right, top + 14, GOLD, 1);
  [["Product Cost", itemsTotal, top + 22], ["Delivery Charges", deliveryCharge, top + 38]].forEach(([label, amt, ly]) => {
    doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(label, rx, ly, { lineBreak: false });
    doc.fillColor(INK).text(amt > 0 || label === "Product Cost" ? `Rs. ${money(amt)}` : "Free", rx, ly, { width: right - rx, align: "right" });
  });
  hline(doc, rx, right, top + 56, GOLD, 0.6);
  doc.font("Helvetica-Bold").fontSize(11).fillColor(INK).text("Total Amount", rx, top + 64, { lineBreak: false });
  doc.text(`Rs. ${money(totals.gross)}`, rx, top + 64, { width: right - rx, align: "right" });
  hline(doc, rx, right, top + 86, GOLD, 0.6);
  doc.font("Helvetica").fontSize(9).fillColor(MUTED).text("Received Amount", rx, top + 95, { lineBreak: false });
  doc.text(`Rs. ${money(received)}`, rx, top + 95, { width: right - rx, align: "right" });

  doc.font("Helvetica-Bold").fontSize(9).fillColor(INK).text("Total Amount (in words)", rx, top + 118, { lineBreak: false });
  doc.font("Helvetica").fontSize(8.5).fillColor(MUTED).text(amountInWords(totals.gross), rx, top + 131, { width: right - rx });

  const sigTop = top + 156;
  doc.save().lineWidth(0.7).strokeColor(GOLD).roundedRect(rx, sigTop, right - rx, 74, 8).stroke().restore();
  if (fs.existsSync(SIGNATURE)) {
    doc.image(SIGNATURE, rx + 40, sigTop + 6, { fit: [right - rx - 80, 36], align: "center", valign: "bottom" });
  }
  hline(doc, rx + 40, right - 40, sigTop + 44, MUTED, 0.6);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(INK)
     .text("Signature", rx, sigTop + 50, { width: right - rx, align: "center" });
  doc.font("Helvetica").fontSize(8.5).fillColor(MUTED)
     .text(`${COMPANY.legalName.toUpperCase()}.in`, rx, sigTop + 62, { width: right - rx, align: "center" });
};

/**
 * Build the invoice model from an Order document — the single place
 * that decides what a line costs and how the tax splits, so the PDF,
 * the emails and the GST report can never disagree.
 */
const buildInvoiceModel = (order) => {
  const items = (order.items || []).map((it) => ({
    title: it.name,
    sub: it.size ? `Size: ${it.size}` : "",
    qty: it.quantity,
    unit: "PCS",
    rate: round2(it.price),
    amount: round2(it.price * it.quantity),
  }));

  const totals = splitGst(order.totalPrice);
  // Product cost is recomputed from the lines; delivery is whatever remains of
  // the total, so the two always add up to it — including on orders placed
  // before delivery charges were stored (those come out as 0 / Free).
  const itemsTotal = round2(items.reduce((s, it) => s + it.amount, 0));
  const deliveryCharge = Math.max(round2(order.totalPrice - itemsTotal), 0);

  const addr = order.shippingAddress || {};
  const addressText = [
    addr.address,
    addr.addressLine2,
    addr.landmark ? `Near ${addr.landmark}` : "",
    [addr.city, addr.state].filter(Boolean).join(", "),
    addr.pincode,
  ].filter(Boolean).join(", ");

  const paid = order.paymentStatus === "paid";
  const COLLECTION_LABELS = { cash: "Cash", upi: "UPI", card: "Card" };
  const paymentLabel = order.paymentMethod === "razorpay"
    ? `Online (Razorpay) — ${paid ? "Paid" : "Pending"}`
    : `Cash on Delivery — ${
        paid
          ? `Collected${order.paymentCollectedVia ? ` (${COLLECTION_LABELS[order.paymentCollectedVia] || order.paymentCollectedVia})` : ""}`
          : "Pending"
      }`;

  return {
    invoiceNumber: order.invoice?.number || "DRAFT",
    date: order.invoice?.issuedAt || order.deliveredAt || order.paidAt || order.createdAt,
    // Orders placed before order numbers existed fall back to the old
    // ID-slice reference so their bills still print something meaningful.
    orderId: order.orderNumber || order._id.toString().slice(-8).toUpperCase(),
    customer: {
      name:    addr.fullName || order.user?.name || "—",
      phone:   addr.phone || order.user?.phone || "—",
      email:   order.user?.email || "",
      address: addressText || "—",
    },
    items,
    itemsTotal,
    deliveryCharge,
    totals,
    received: paid ? totals.gross : 0,
    paymentLabel,
  };
};

/**
 * Render the invoice into a PDFKit document. The caller pipes it
 * wherever it needs to go — an HTTP response, or a buffer for email.
 *
 * Async because the payment QR is generated before drawing starts —
 * PDFKit itself stays a plain synchronous document once that's done.
 */
const renderInvoice = async (order) => {
  const model = buildInvoiceModel(order);

  const doc = new PDFDocument({
    size: "A4",
    margin: MARGIN,
    info: {
      Title: `Bill of Supply ${model.invoiceNumber}`,
      Author: COMPANY.name,
      Subject: `Bill for order ${model.orderId}`,
    },
  });

  drawFrame(doc);
  let y = drawHeader(doc);
  y = drawMeta(doc, y, model);
  y = drawBillTo(doc, y, model.customer);
  y = drawItems(doc, y, model);
  await drawFooter(doc, y, model);

  doc.end();
  return doc;
};

/** The same invoice collected into a Buffer, for mail attachments. */
const renderInvoiceBuffer = async (order) => {
  const doc = await renderInvoice(order);
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
};

/** Filename used for both the download and the mail attachment. */
const invoiceFileName = (order) => {
  const num = order.invoice?.number || order._id.toString().slice(-8).toUpperCase();
  return `Invoice-${String(num).replace(/[/\\]/g, "-")}.pdf`;
};

module.exports = {
  renderInvoice,
  renderInvoiceBuffer,
  buildInvoiceModel,
  formatInvoiceNumber,
  financialYear,
  invoiceDate,
  invoiceFileName,
};
