const fs = require("fs");
const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { COMPANY, BRAND, LOGO_WHITE, round2, splitGst, GST_RATE, CGST_RATE, SGST_RATE } = require("../config/company");

/* ══════════════════════════════════════════════════════════════
   BUSINESS REPORTS

   Distinct from Data Export, which dumps raw collections. A report
   answers a question — what did we sell, what tax do we owe, which
   bills were raised, how did the money arrive — and is built to be
   handed to an accountant or kept for the file.

   Everything here counts the same population: settled sales, i.e.
   orders that were paid for and not cancelled. That single rule is
   what keeps the sales total, the GST liability and the bills
   register agreeing with each other.
══════════════════════════════════════════════════════════════ */

const PAGE_MARGIN = 40;

/* ── shared formatting ───────────────────────────────────────── */
const money = (n) => Number(n || 0).toFixed(2);
const moneyIn = (n) => `Rs. ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const id8 = (v) => (v ? v.toString().slice(-8).toUpperCase() : "—");
const payLabel = (o) => (o.paymentMethod === "razorpay" ? "Online" : "COD");

/** Date window from the UI's range picker. */
const dateWindow = (range, from, to) => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (range) {
    case "today":    return { $gte: start };
    case "7days":    start.setDate(start.getDate() - 7);  return { $gte: start };
    case "30days":   start.setDate(start.getDate() - 30); return { $gte: start };
    case "90days":   start.setDate(start.getDate() - 90); return { $gte: start };
    case "thisyear": return { $gte: new Date(now.getFullYear(), 0, 1) };
    case "custom":
      if (!from && !to) return undefined;
      return {
        ...(from ? { $gte: new Date(from) } : {}),
        ...(to ? { $lte: new Date(new Date(to).setHours(23, 59, 59, 999)) } : {}),
      };
    default: return undefined;
  }
};

const rangeLabel = (range, from, to) => {
  if (range === "custom" && (from || to)) return `${from || "start"} to ${to || "today"}`;
  return {
    today: "Today", "7days": "Last 7 days", "30days": "Last 30 days",
    "90days": "Last 90 days", thisyear: "This calendar year",
  }[range] || "All time";
};

/* "This order has a bill."

   Deliberately `$gt: ""` rather than `$ne: ""`: orders created before
   invoicing existed have no `invoice` field at all, and in MongoDB a
   `$ne` matches missing fields — which counted every historical order
   as billed. `$gt: ""` compares within the string type, so missing and
   null values fall outside it and only a real invoice number matches. */
const HAS_INVOICE = { "invoice.number": { $gt: "" } };

/** Settled sales — the population every report is built from. */
const salesFilter = (window) => ({
  paymentStatus: "paid",
  status: { $ne: "Cancelled" },
  ...(window ? { createdAt: window } : {}),
});

/** Load settled sales for a window, newest first. */
const loadSales = (window) =>
  Order.find(salesFilter(window)).populate("user", "name email phone").sort({ createdAt: -1 }).lean();

/* ══════════════════════════════════════════════════════════════
   REPORT DEFINITIONS

   Each report declares its own summary lines and columns; the PDF
   and Excel renderers below are generic over them. `pdf` is the
   column's relative width in the PDF table — omit it to keep a
   column out of the PDF but still in the spreadsheet, which has
   room for the wide fields.
══════════════════════════════════════════════════════════════ */

const REPORTS = {
  /* ── Sales ─────────────────────────────────────────────────── */
  sales: {
    label: "Sales Report",
    blurb: "Every settled sale in the period, with its value and how it was paid.",
    load: loadSales,
    summary: (rows) => {
      const gross = rows.reduce((s, o) => s + (o.totalPrice || 0), 0);
      const units = rows.reduce((s, o) => s + o.items.reduce((n, i) => n + i.quantity, 0), 0);
      const online = rows.filter((o) => o.paymentMethod === "razorpay");
      return [
        ["Orders Billed", rows.length],
        ["Units Sold", units],
        ["Gross Sales", moneyIn(gross)],
        ["Average Order Value", moneyIn(rows.length ? gross / rows.length : 0)],
        ["Online / COD", `${online.length} / ${rows.length - online.length}`],
        ["Delivered", rows.filter((o) => o.status === "Delivered").length],
      ];
    },
    columns: [
      { header: "#",         w: 5,  pdf: 4,  value: (o, i) => i + 1 },
      { header: "Date",      w: 14, pdf: 13, value: (o) => day(o.createdAt) },
      { header: "Order ID",  w: 12, pdf: 11, value: (o) => id8(o._id) },
      { header: "Invoice No",w: 18, pdf: 16, value: (o) => o.invoice?.number || "—" },
      { header: "Customer",  w: 22, pdf: 18, value: (o) => o.user?.name || o.shippingAddress?.fullName || "—" },
      { header: "Email",     w: 26,          value: (o) => o.user?.email || "—" },
      { header: "Phone",     w: 14,          value: (o) => o.shippingAddress?.phone || "—" },
      { header: "City",      w: 16, pdf: 12, value: (o) => o.shippingAddress?.city || "—" },
      { header: "Items",     w: 7,  pdf: 6,  value: (o) => o.items.reduce((n, i) => n + i.quantity, 0) },
      { header: "Payment",   w: 10, pdf: 9,  value: payLabel },
      { header: "Status",    w: 12, pdf: 10, value: (o) => o.status },
      { header: "Amount",    w: 14, pdf: 13, value: (o) => money(o.totalPrice), excel: (o) => o.totalPrice || 0, numeric: true },
    ],
    total: (rows) => ["Total Sales", moneyIn(rows.reduce((s, o) => s + (o.totalPrice || 0), 0))],
  },

  /* ── GST ───────────────────────────────────────────────────── */
  gst: {
    label: "GST Summary",
    blurb: `Tax liability on settled sales. Catalogue prices are GST-inclusive at ${GST_RATE}%, split ${CGST_RATE}% CGST and ${SGST_RATE}% SGST.`,
    load: loadSales,
    summary: (rows) => {
      const t = rows.reduce((acc, o) => {
        const s = splitGst(o.totalPrice);
        acc.gross += s.gross; acc.taxable += s.taxable; acc.cgst += s.cgst; acc.sgst += s.sgst;
        return acc;
      }, { gross: 0, taxable: 0, cgst: 0, sgst: 0 });
      return [
        ["Invoices", rows.length],
        ["Gross Receipts", moneyIn(t.gross)],
        ["Taxable Value", moneyIn(t.taxable)],
        [`CGST @ ${CGST_RATE}%`, moneyIn(t.cgst)],
        [`SGST @ ${SGST_RATE}%`, moneyIn(t.sgst)],
        ["Total GST Payable", moneyIn(round2(t.cgst + t.sgst))],
      ];
    },
    columns: [
      { header: "#",           w: 5,  pdf: 4,  value: (o, i) => i + 1 },
      { header: "Date",        w: 14, pdf: 13, value: (o) => day(o.invoice?.issuedAt || o.createdAt) },
      { header: "Invoice No",  w: 18, pdf: 17, value: (o) => o.invoice?.number || "—" },
      { header: "Order ID",    w: 12, pdf: 11, value: (o) => id8(o._id) },
      { header: "Customer",    w: 22, pdf: 18, value: (o) => o.user?.name || o.shippingAddress?.fullName || "—" },
      { header: "Place",       w: 16,          value: (o) => `${o.shippingAddress?.city || "—"}${o.shippingAddress?.state ? `, ${o.shippingAddress.state}` : ""}` },
      { header: "Taxable",     w: 13, pdf: 12, value: (o) => money(splitGst(o.totalPrice).taxable), excel: (o) => splitGst(o.totalPrice).taxable, numeric: true },
      { header: `CGST ${CGST_RATE}%`, w: 11, pdf: 10, value: (o) => money(splitGst(o.totalPrice).cgst), excel: (o) => splitGst(o.totalPrice).cgst, numeric: true },
      { header: `SGST ${SGST_RATE}%`, w: 11, pdf: 10, value: (o) => money(splitGst(o.totalPrice).sgst), excel: (o) => splitGst(o.totalPrice).sgst, numeric: true },
      { header: "Invoice Total", w: 14, pdf: 13, value: (o) => money(o.totalPrice), excel: (o) => o.totalPrice || 0, numeric: true },
    ],
    total: (rows) => {
      const tax = rows.reduce((s, o) => { const g = splitGst(o.totalPrice); return s + g.cgst + g.sgst; }, 0);
      return ["Total GST Payable", moneyIn(round2(tax))];
    },
  },

  /* ── Bills register ────────────────────────────────────────── */
  invoices: {
    label: "Bills Register",
    blurb: "Every tax invoice raised in the period, in the order the numbers were issued.",
    load: async (window) =>
      Order.find({
        ...HAS_INVOICE,
        ...(window ? { "invoice.issuedAt": window } : {}),
      }).populate("user", "name email phone").sort({ "invoice.issuedAt": -1 }).lean(),
    summary: (rows) => {
      const gross = rows.reduce((s, o) => s + (o.totalPrice || 0), 0);
      const tax = rows.reduce((s, o) => { const g = splitGst(o.totalPrice); return s + g.cgst + g.sgst; }, 0);
      return [
        ["Bills Raised", rows.length],
        ["Billed Value", moneyIn(gross)],
        ["Tax Component", moneyIn(round2(tax))],
        ["First Bill", rows.length ? rows[rows.length - 1].invoice.number : "—"],
        ["Latest Bill", rows.length ? rows[0].invoice.number : "—"],
      ];
    },
    columns: [
      { header: "#",           w: 5,  pdf: 4,  value: (o, i) => i + 1 },
      { header: "Invoice No",  w: 18, pdf: 17, value: (o) => o.invoice?.number || "—" },
      { header: "Issued",      w: 14, pdf: 13, value: (o) => day(o.invoice?.issuedAt) },
      { header: "Order ID",    w: 12, pdf: 11, value: (o) => id8(o._id) },
      { header: "Customer",    w: 22, pdf: 19, value: (o) => o.user?.name || o.shippingAddress?.fullName || "—" },
      { header: "Phone",       w: 14, pdf: 13, value: (o) => o.shippingAddress?.phone || "—" },
      { header: "Email",       w: 26,          value: (o) => o.user?.email || "—" },
      { header: "Payment",     w: 10, pdf: 9,  value: payLabel },
      { header: "Order Status",w: 12, pdf: 11, value: (o) => o.status },
      { header: "Amount",      w: 14, pdf: 13, value: (o) => money(o.totalPrice), excel: (o) => o.totalPrice || 0, numeric: true },
    ],
    total: (rows) => ["Total Billed", moneyIn(rows.reduce((s, o) => s + (o.totalPrice || 0), 0))],
  },

  /* ── Payments ──────────────────────────────────────────────── */
  payments: {
    label: "Payment Report",
    blurb: "How the money arrived — online settlements, cash collected on delivery, and refunds paid out.",
    load: async (window) =>
      Order.find({
        $or: [
          { paymentMethod: "razorpay", paymentStatus: { $in: ["paid", "refunded"] } },
          { paymentMethod: "cod" },
        ],
        ...(window ? { createdAt: window } : {}),
      }).populate("user", "name email phone").sort({ paidAt: -1, createdAt: -1 }).lean(),
    summary: (rows) => {
      const sum = (fn) => rows.filter(fn).reduce((s, o) => s + (o.totalPrice || 0), 0);
      const online = (o) => o.paymentMethod === "razorpay" && o.paymentStatus === "paid";
      const cod = (o) => o.paymentMethod === "cod" && o.paymentStatus === "paid";
      const due = (o) => o.paymentStatus === "pending" && o.status !== "Cancelled";
      return [
        ["Transactions", rows.length],
        ["Collected Online", moneyIn(sum(online))],
        ["Collected COD", moneyIn(sum(cod))],
        ["Total Collected", moneyIn(sum(online) + sum(cod))],
        ["Awaiting Collection", moneyIn(sum(due))],
        ["Refunded", moneyIn(sum((o) => o.paymentStatus === "refunded"))],
      ];
    },
    columns: [
      { header: "#",          w: 5,  pdf: 4,  value: (o, i) => i + 1 },
      { header: "Date",       w: 14, pdf: 12, value: (o) => day(o.paidAt || o.createdAt) },
      { header: "Order ID",   w: 12, pdf: 11, value: (o) => id8(o._id) },
      { header: "Customer",   w: 22, pdf: 18, value: (o) => o.user?.name || o.shippingAddress?.fullName || "—" },
      { header: "Email",      w: 26,          value: (o) => o.user?.email || "—" },
      { header: "Phone",      w: 14, pdf: 13, value: (o) => o.shippingAddress?.phone || "—" },
      { header: "Method",     w: 10, pdf: 9,  value: payLabel },
      { header: "Pay Status", w: 12, pdf: 11, value: (o) => (o.paymentStatus || "").replace(/^./, (c) => c.toUpperCase()) },
      { header: "Payment ID", w: 24, pdf: 15, value: (o) => o.razorpayPaymentId || "—" },
      { header: "Invoice No", w: 18,          value: (o) => o.invoice?.number || "—" },
      { header: "Amount",     w: 14, pdf: 13, value: (o) => money(o.totalPrice), excel: (o) => o.totalPrice || 0, numeric: true },
    ],
    total: (rows) => [
      "Total Collected",
      moneyIn(rows.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + (o.totalPrice || 0), 0)),
    ],
  },

  /* ── Product performance ───────────────────────────────────── */
  products: {
    label: "Product Sales Report",
    blurb: "What actually sold in the period, ranked by revenue.",
    load: async (window) => {
      const orders = await loadSales(window);
      const byProduct = new Map();
      orders.forEach((o) => {
        o.items.forEach((it) => {
          const key = it.product?.toString() || it.name;
          const row = byProduct.get(key) || { name: it.name, units: 0, revenue: 0, orders: 0 };
          row.units += it.quantity;
          row.revenue += it.price * it.quantity;
          row.orders += 1;
          byProduct.set(key, row);
        });
      });
      return [...byProduct.values()].sort((a, b) => b.revenue - a.revenue);
    },
    summary: (rows) => [
      ["Products Sold", rows.length],
      ["Units Sold", rows.reduce((s, r) => s + r.units, 0)],
      ["Revenue", moneyIn(rows.reduce((s, r) => s + r.revenue, 0))],
      ["Best Seller", rows[0]?.name || "—"],
    ],
    columns: [
      { header: "#",          w: 5,  pdf: 5,  value: (r, i) => i + 1 },
      { header: "Product",    w: 38, pdf: 40, value: (r) => r.name },
      { header: "Order Lines",w: 12, pdf: 13, value: (r) => r.orders, numeric: true },
      { header: "Units Sold", w: 12, pdf: 13, value: (r) => r.units, excel: (r) => r.units, numeric: true },
      { header: "Revenue",    w: 16, pdf: 16, value: (r) => money(r.revenue), excel: (r) => r.revenue, numeric: true },
    ],
    total: (rows) => ["Total Revenue", moneyIn(rows.reduce((s, r) => s + r.revenue, 0))],
  },
};

/* ══════════════════════════════════════════════════════════════
   PDF RENDERER
══════════════════════════════════════════════════════════════ */

const cellValue = (col, rec, i) => {
  const v = col.value(rec, i);
  return v === undefined || v === null || v === "" ? "—" : String(v);
};

const sendPdf = (res, def, key, rows, meta) => {
  const doc = new PDFDocument({
    size: "A4", layout: "landscape", margin: PAGE_MARGIN,
    info: { Title: `${def.label} — ${COMPANY.name}`, Author: COMPANY.name },
  });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${key}-report-${new Date().toISOString().slice(0, 10)}.pdf"`);
  doc.pipe(res);

  const W = doc.page.width;
  const avail = W - PAGE_MARGIN * 2;

  /* Proportional column layout, so any column set fills the page width. */
  const cols = (() => {
    const picked = def.columns.filter((c) => c.pdf);
    const total = picked.reduce((s, c) => s + c.pdf, 0);
    let x = PAGE_MARGIN;
    return picked.map((c) => {
      const w = (c.pdf / total) * avail;
      const col = { ...c, x, w };
      x += w;
      return col;
    });
  })();

  /* ── Masthead: the same brand band the invoice uses, so a report
     and a bill from this business are visibly related. ─────────── */
  const drawMasthead = () => {
    const bandH = 74;
    doc.save().rect(0, 0, W, bandH).fill(BRAND.band).restore();
    doc.save().rect(0, bandH, W, 3).fill(BRAND.primary).restore();

    if (fs.existsSync(LOGO_WHITE)) doc.image(LOGO_WHITE, PAGE_MARGIN, 12, { fit: [74, 44] });

    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(15)
       .text(def.label, PAGE_MARGIN + 96, 18);
    doc.font("Helvetica").fontSize(8.5).fillColor("#cfe6f5")
       .text(def.blurb, PAGE_MARGIN + 96, 37, { width: avail * 0.55 });

    doc.font("Helvetica-Bold").fontSize(11).fillColor("#ffffff")
       .text(COMPANY.name, W / 2, 16, { width: avail / 2, align: "right" });
    doc.font("Helvetica").fontSize(8).fillColor("#cfe6f5")
       .text(`GSTIN ${COMPANY.gstin}`, W / 2, 32, { width: avail / 2, align: "right" })
       .text(`Period: ${meta.period}`, W / 2, 43, { width: avail / 2, align: "right" })
       .text(`Generated ${day(new Date())}`, W / 2, 54, { width: avail / 2, align: "right" });

    return bandH + 3;
  };

  /* ── KPI strip: the summary as a row of tiles rather than a list.
     A report is read top-down, and these are the numbers that get
     read. ──────────────────────────────────────────────────────── */
  const drawSummary = (top) => {
    const stats = def.summary(rows);
    const n = stats.length;
    const gap = 8;
    const tileW = (avail - gap * (n - 1)) / n;
    const h = 46;

    stats.forEach(([label, value], i) => {
      const x = PAGE_MARGIN + i * (tileW + gap);
      doc.save().rect(x, top, tileW, h).fill(BRAND.light).restore();
      doc.save().rect(x, top, 2.5, h).fill(BRAND.primary).restore();
      doc.font("Helvetica").fontSize(7).fillColor(BRAND.muted)
         .text(String(label).toUpperCase(), x + 9, top + 9, { width: tileW - 16, ellipsis: true, lineBreak: false });
      doc.font("Helvetica-Bold").fontSize(12).fillColor(BRAND.dark)
         .text(String(value), x + 9, top + 22, { width: tileW - 16, ellipsis: true, lineBreak: false });
    });

    return top + h;
  };

  const ROW_H = 17;
  const drawTableHead = (top) => {
    doc.save().rect(PAGE_MARGIN, top, avail, 20).fill(BRAND.dark).restore();
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#ffffff");
    cols.forEach((c) =>
      doc.text(c.header.toUpperCase(), c.x + 5, top + 7,
        { width: c.w - 10, align: c.numeric ? "right" : "left", ellipsis: true, lineBreak: false })
    );
    return top + 20;
  };

  let y = drawMasthead();
  y = drawSummary(y + 16) + 18;
  y = drawTableHead(y);

  if (!rows.length) {
    doc.font("Helvetica").fontSize(9).fillColor(BRAND.muted)
       .text("No records in this period.", PAGE_MARGIN + 8, y + 8);
    y += ROW_H;
  }

  rows.forEach((rec, i) => {
    if (y > doc.page.height - 70) {
      doc.addPage();
      y = drawTableHead(PAGE_MARGIN);
    }
    if (i % 2 === 1) doc.save().rect(PAGE_MARGIN, y, avail, ROW_H).fill("#f8fbfd").restore();
    doc.font("Helvetica").fontSize(8).fillColor(BRAND.ink);
    cols.forEach((c) =>
      doc.text(cellValue(c, rec, i), c.x + 5, y + 5,
        { width: c.w - 10, align: c.numeric ? "right" : "left", ellipsis: true, lineBreak: false })
    );
    y += ROW_H;
  });

  // Closing total, banded so it reads as the bottom line of the table
  if (def.total && rows.length) {
    if (y > doc.page.height - 70) { doc.addPage(); y = PAGE_MARGIN; }
    const [label, value] = def.total(rows);
    doc.save().rect(PAGE_MARGIN, y, avail, 24).fill(BRAND.light).restore();
    doc.font("Helvetica-Bold").fontSize(10).fillColor(BRAND.dark)
       .text(label, PAGE_MARGIN + 10, y + 7, { width: avail * 0.6 });
    doc.font("Helvetica-Bold").fontSize(11).fillColor(BRAND.dark)
       .text(value, PAGE_MARGIN, y + 6, { width: avail - 10, align: "right" });
  }

  doc.end();
};

/* ══════════════════════════════════════════════════════════════
   EXCEL RENDERER
══════════════════════════════════════════════════════════════ */

const sendExcel = (res, def, key, rows, meta) => {
  const wb = XLSX.utils.book_new();

  const cover = XLSX.utils.aoa_to_sheet([
    [COMPANY.name],
    [`${COMPANY.address1}, ${COMPANY.address2}`],
    [`GSTIN: ${COMPANY.gstin}`],
    [],
    [def.label],
    [def.blurb],
    [],
    ["Period", meta.period],
    ["Generated", new Date().toLocaleString("en-IN")],
    [],
    ...def.summary(rows),
    ...(def.total && rows.length ? [[], def.total(rows)] : []),
  ]);
  cover["!cols"] = [{ wch: 30 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, cover, "Summary");

  const data = rows.map((rec, i) => {
    const out = {};
    def.columns.forEach((c) => { out[c.header] = c.excel ? c.excel(rec, i) : cellValue(c, rec, i); });
    return out;
  });

  const sheet = data.length
    ? XLSX.utils.json_to_sheet(data)
    : XLSX.utils.aoa_to_sheet([def.columns.map((c) => c.header), ["No records in this period"]]);
  sheet["!cols"] = def.columns.map((c) => ({ wch: c.w }));
  XLSX.utils.book_append_sheet(wb, sheet, def.label.slice(0, 31));

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${key}-report-${new Date().toISOString().slice(0, 10)}.xlsx"`);
  res.send(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
};

/* ══════════════════════════════════════════════════════════════
   ROUTE HANDLERS
══════════════════════════════════════════════════════════════ */

// @route  GET /api/reports/overview?range=&from=&to=
// @desc   Headline figures and series for the Reports dashboard
// @access Admin
const getOverview = async (req, res) => {
  try {
    const { range = "30days", from, to } = req.query;
    const window = dateWindow(range, from, to);
    const sales = await loadSales(window);

    const gross = sales.reduce((s, o) => s + (o.totalPrice || 0), 0);
    const tax = sales.reduce((acc, o) => {
      const g = splitGst(o.totalPrice);
      acc.taxable += g.taxable; acc.cgst += g.cgst; acc.sgst += g.sgst;
      return acc;
    }, { taxable: 0, cgst: 0, sgst: 0 });

    const units = sales.reduce((s, o) => s + o.items.reduce((n, i) => n + i.quantity, 0), 0);

    /* Daily series for the chart — keyed by local date so a sale at
       11pm lands on the day it was made, not the next UTC day. */
    const seriesMap = new Map();
    sales.forEach((o) => {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const row = seriesMap.get(key) || { date: key, revenue: 0, orders: 0 };
      row.revenue = round2(row.revenue + (o.totalPrice || 0));
      row.orders += 1;
      seriesMap.set(key, row);
    });
    const series = [...seriesMap.values()].sort((a, b) => a.date.localeCompare(b.date));

    // Top products by revenue
    const productMap = new Map();
    sales.forEach((o) => o.items.forEach((it) => {
      const key = it.product?.toString() || it.name;
      const row = productMap.get(key) || { name: it.name, units: 0, revenue: 0 };
      row.units += it.quantity;
      row.revenue = round2(row.revenue + it.price * it.quantity);
      productMap.set(key, row);
    }));
    const topProducts = [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6);

    const onlineOrders = sales.filter((o) => o.paymentMethod === "razorpay");
    const codOrders = sales.filter((o) => o.paymentMethod === "cod");

    // Counted outside the settled-sales population on purpose
    const [pendingOrders, cancelledOrders, refunded, billsRaised, newCustomers] = await Promise.all([
      Order.countDocuments({ status: { $in: ["Pending", "Processing", "Printing", "Ready for Delivery", "Shipped"] }, ...(window ? { createdAt: window } : {}) }),
      Order.countDocuments({ status: "Cancelled", ...(window ? { createdAt: window } : {}) }),
      Order.aggregate([
        { $match: { paymentStatus: "refunded", ...(window ? { createdAt: window } : {}) } },
        { $group: { _id: null, total: { $sum: "$totalPrice" }, count: { $sum: 1 } } },
      ]),
      Order.countDocuments({ ...HAS_INVOICE, ...(window ? { "invoice.issuedAt": window } : {}) }),
      User.countDocuments({ role: "user", ...(window ? { createdAt: window } : {}) }),
    ]);

    res.json({
      period: rangeLabel(range, from, to),
      totals: {
        gross: round2(gross),
        taxable: round2(tax.taxable),
        cgst: round2(tax.cgst),
        sgst: round2(tax.sgst),
        gst: round2(tax.cgst + tax.sgst),
        orders: sales.length,
        units,
        avgOrderValue: round2(sales.length ? gross / sales.length : 0),
        billsRaised,
        pendingOrders,
        cancelledOrders,
        newCustomers,
        refunded: round2(refunded[0]?.total || 0),
        refundCount: refunded[0]?.count || 0,
      },
      paymentSplit: [
        { method: "Online", orders: onlineOrders.length, amount: round2(onlineOrders.reduce((s, o) => s + o.totalPrice, 0)) },
        { method: "COD", orders: codOrders.length, amount: round2(codOrders.reduce((s, o) => s + o.totalPrice, 0)) },
      ],
      series,
      topProducts,
      gstRate: { total: GST_RATE, cgst: CGST_RATE, sgst: SGST_RATE },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  GET /api/reports/:type?format=pdf|excel&range=&from=&to=
// @desc   Download a report
// @access Admin
const downloadReport = async (req, res) => {
  try {
    const key = String(req.params.type || "").toLowerCase();
    const def = REPORTS[key];
    if (!def) {
      return res.status(400).json({
        message: `Unknown report "${key}". Available: ${Object.keys(REPORTS).join(", ")}`,
      });
    }

    const { format = "pdf", range = "30days", from, to } = req.query;
    const window = dateWindow(range, from, to);
    const rows = await def.load(window);
    const meta = { period: rangeLabel(range, from, to) };

    return format === "excel"
      ? sendExcel(res, def, key, rows, meta)
      : sendPdf(res, def, key, rows, meta);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  GET /api/reports
// @desc   The catalogue of reports, with a row count for the chosen period
// @access Admin
const listReports = async (req, res) => {
  try {
    const { range = "30days", from, to } = req.query;
    const window = dateWindow(range, from, to);

    const entries = await Promise.all(
      Object.entries(REPORTS).map(async ([key, def]) => {
        const rows = await def.load(window);
        return { key, label: def.label, blurb: def.blurb, count: rows.length };
      })
    );

    res.json({ period: rangeLabel(range, from, to), reports: entries });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getOverview, downloadReport, listReports, REPORTS };
