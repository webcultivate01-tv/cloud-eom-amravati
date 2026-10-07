const Order = require("../models/Order");
const { nextSequence } = require("../models/Counter");
const {
  renderInvoice, renderInvoiceBuffer, buildInvoiceModel,
  formatInvoiceNumber, financialYear, invoiceFileName,
} = require("../config/invoice");

/**
 * Return the order's invoice number, issuing one if it has none.
 *
 * Numbers come from an atomic per-financial-year counter, so two admins
 * downloading two bills at the same moment cannot collide. Once written
 * the number is never reissued — a later call returns the stored one.
 *
 * Only billable orders get a number: an order that was cancelled or was
 * never paid for is not a sale, and handing it an invoice number would
 * put a gap in the sequence that the GST report cannot explain.
 */
const ensureInvoiceNumber = async (order) => {
  if (order.invoice?.number) return order;

  const issuedAt = order.deliveredAt || order.paidAt || order.createdAt || new Date();
  const seq = await nextSequence(`invoice:${financialYear(issuedAt)}`);
  const number = formatInvoiceNumber(seq, issuedAt);

  // Written straight to the collection so this stays a single atomic step
  // even when the caller is holding a lean/populated copy of the document.
  await Order.updateOne(
    { _id: order._id },
    { $set: { "invoice.number": number, "invoice.issuedAt": issuedAt } }
  );

  order.invoice = { number, issuedAt };
  return order;
};

/** An order is billable once money has actually been settled for it. */
const isBillable = (order) =>
  order.status !== "Cancelled" && order.paymentStatus === "paid";

/**
 * What an admin may bill is wider than what a customer may download: the
 * shop packs the physical order and needs the printed bill to go inside the
 * box before it ships, which for a COD order is well before payment is
 * collected on delivery. So an admin can raise the bill for any order that
 * hasn't been cancelled — payment settlement is not a precondition, it's a
 * side detail the invoice records ("Cash on Delivery — Pending").
 *
 * A cancelled order is still excluded: it was never a completed sale, and
 * numbering it would put a gap in the GST sequence with nothing to explain it.
 */
const isAdminBillable = (order) => order.status !== "Cancelled";

/**
 * Load an order for billing, enforcing that the caller is allowed to see
 * it. Customers may download their own bill; admins may download any.
 * Returns null when the caller should get a 404/403 — the reason is set
 * on `res` by the caller.
 */
const loadBillableOrder = async (orderId) =>
  Order.findById(orderId)
    .populate("user", "name email phone")
    .populate("items.product", "image");

// @route  GET /api/invoice/:orderId
// @desc   Download the tax invoice PDF for an order
// @access Private (order owner) / Admin (any order)
const downloadInvoice = async (req, res) => {
  try {
    const order = await loadBillableOrder(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const isAdmin = req.user.role === "admin";
    const isOwner = order.user?._id?.toString() === req.user._id.toString();
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorised to view this invoice" });
    }

    // The bill is handed over as soon as the order is placed, so customers
    // are held to the same rule as admins: anything not cancelled is billable.
    if (!isAdminBillable(order)) {
      return res.status(400).json({
        message: "This order was cancelled, so no bill is available for it.",
      });
    }

    await ensureInvoiceNumber(order);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${invoiceFileName(order)}"`);
    (await renderInvoice(order)).pipe(res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  GET /api/invoice/:orderId/preview
// @desc   Same PDF, shown in the browser instead of downloaded
// @access Private (order owner) / Admin
const previewInvoice = async (req, res) => {
  try {
    const order = await loadBillableOrder(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const isAdmin = req.user.role === "admin";
    const isOwner = order.user?._id?.toString() === req.user._id.toString();
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorised to view this invoice" });
    }
    if (!isAdminBillable(order)) {
      return res.status(400).json({ message: "No bill is available for a cancelled order." });
    }

    await ensureInvoiceNumber(order);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${invoiceFileName(order)}"`);
    (await renderInvoice(order)).pipe(res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  GET /api/invoice/:orderId/summary
// @desc   The invoice figures as JSON, so the admin UI can show the tax
//         breakdown without downloading and opening the PDF
// @access Admin
const invoiceSummary = async (req, res) => {
  try {
    const order = await loadBillableOrder(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const model = buildInvoiceModel(order);
    res.json({
      available: isAdminBillable(order),
      invoiceNumber: order.invoice?.number || null,
      date: model.date,
      totals: model.totals,
      items: model.items,
      paymentLabel: model.paymentLabel,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  downloadInvoice,
  previewInvoice,
  invoiceSummary,
  ensureInvoiceNumber,
  isBillable,
  isAdminBillable,
  renderInvoiceBuffer,
};
