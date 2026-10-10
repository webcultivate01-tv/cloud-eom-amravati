const Razorpay = require("razorpay");
const crypto = require("crypto");
const Order = require("../models/Order");
const User = require("../models/User");
const Coupon = require("../models/Coupon");
const { sendOrderConfirmation } = require("../config/mailer");
const { nextOrderNumber } = require("../models/Counter");
const { computeOrderTotals, findDeliveryZone, buildOrderItems, OrderInputError } = require("../config/orderTotals");
const {
  CouponError, normalizeCode, applyCoupon, reserveCoupon, returnCouponUse, releaseCouponForOrder, couponSnapshot,
} = require("../config/coupon");
const { round2 } = require("../config/company");
const { ensureInvoiceNumber, isBillable } = require("./invoiceController");
const { renderInvoiceBuffer, invoiceFileName } = require("../config/invoice");

// Lazy-initialize so placeholder values in .env don't crash on startup
const getRazorpay = () =>
  new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

// @route  POST /api/payment/create-order
// @desc   Create a Razorpay order (returns order_id to frontend)
//         Send { items, shippingAddress, couponCode? } and the amount is worked
//         out here from DB prices, the pincode's delivery rate and the coupon —
//         so the customer is charged exactly what the order will be recorded
//         at. A bare { amount } still works as before.
// @access Private
const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, items, shippingAddress, couponCode } = req.body; // amount in rupees

    let payable = amount;
    let notes;
    if (Array.isArray(items) && items.length > 0) {
      const orderItems = await buildOrderItems(items);

      let discount = 0;
      if (couponCode) {
        const applied = await applyCoupon({ code: couponCode, userId: req.user._id, orderItems });
        discount = applied.discount;
        // Remembered on the Razorpay order so /verify honours exactly this discount
        notes = { couponCode: applied.coupon.code, discount: String(discount) };
      }
      payable = computeOrderTotals(orderItems, await findDeliveryZone(shippingAddress?.pincode), discount).totalPrice;

      if (payable < 1) {
        return res.status(400).json({
          message: "This order total is too low to pay online. Choose Cash on Delivery, or remove the coupon.",
        });
      }
    }

    if (!payable || payable <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const options = {
      amount: Math.round(payable * 100), // Razorpay expects paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      ...(notes ? { notes } : {}),
    };

    const order = await getRazorpay().orders.create(options);
    res.json({
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    if (err instanceof OrderInputError) return res.status(err.status).json({ message: err.message });
    if (err instanceof CouponError) return res.status(400).json({ message: err.message });
    res.status(500).json({ message: err.message || "Razorpay order creation failed" });
  }
};

// @route  POST /api/payment/verify
// @desc   Verify Razorpay signature and create the order in DB
// @access Private
const verifyPaymentAndCreateOrder = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      items,
      shippingAddress,
      customerNote,
    } = req.body;

    // 1. Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature. Payment not verified." });
    }

    // 2. Build order items with fresh prices from DB
    const orderItems = await buildOrderItems(items);

    /* 3. Coupon. The customer has already paid, so the discount must be the one
       that was charged — read back from the Razorpay order the server created
       (its notes), not from this request. Only if Razorpay can't be reached is
       it re-derived from the coupon code sent along, with the rules that can
       change mid-payment (dates, limits) relaxed. */
    let coupon = null;
    let discount = 0;
    let charged = null; // what Razorpay actually collected, in rupees
    let couponCode = "";
    let notedDiscount = null;
    try {
      const rzOrder = await getRazorpay().orders.fetch(razorpay_order_id);
      charged = round2(rzOrder.amount / 100);
      couponCode = rzOrder.notes?.couponCode || "";
      notedDiscount = Number(rzOrder.notes?.discount) || 0;
    } catch (fetchErr) {
      console.error("Could not read Razorpay order", razorpay_order_id, fetchErr.message);
      couponCode = req.body.couponCode || "";
    }

    if (couponCode) {
      if (notedDiscount !== null) {
        coupon = await Coupon.findOne({ code: normalizeCode(couponCode) });
        discount = coupon ? notedDiscount : 0;
      } else {
        try {
          const applied = await applyCoupon({ code: couponCode, userId: req.user._id, orderItems, lenient: true });
          coupon = applied.coupon;
          discount = applied.discount;
        } catch (couponErr) {
          console.error("Coupon not applied to a paid order", razorpay_order_id, couponErr.message);
        }
      }
    }

    const totals = computeOrderTotals(orderItems, await findDeliveryZone(shippingAddress?.pincode), discount);
    if (charged !== null && Math.abs(charged - totals.totalPrice) > 0.01) {
      console.error(`Paid amount ${charged} differs from order total ${totals.totalPrice} for`, razorpay_order_id);
    }

    // The customer has paid, so the use is counted even if the limit was hit meanwhile
    if (coupon) await reserveCoupon(coupon, { force: true });

    // 4. Create order in DB as paid
    let order;
    try {
      order = await Order.create({
        user: req.user._id,
        orderNumber: await nextOrderNumber(),
        items: orderItems,
        shippingAddress,
        ...totals,
        ...(coupon ? { coupon: couponSnapshot(coupon) } : {}),
        customerNote: customerNote || "",
        paymentMethod: "razorpay",
        paymentStatus: "paid",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paidAt: new Date(),
        status: "Processing", // auto-advance from Pending since payment confirmed
      });
    } catch (createErr) {
      if (coupon) await returnCouponUse(coupon._id);
      throw createErr;
    }

    /* Paid online means the sale is already settled, so the tax invoice
       goes out with the confirmation email right away — unlike a COD order,
       which isn't paid until the courier collects it on delivery and only
       gets its invoice then (see orderController.updateOrderStatus). */
    let invoiceAttachment = [];
    if (isBillable(order)) {
      try {
        await ensureInvoiceNumber(order);
        invoiceAttachment = [{
          filename: invoiceFileName(order),
          content: await renderInvoiceBuffer(order),
          contentType: "application/pdf",
        }];
      } catch (err) {
        console.error("Invoice generation failed for order", order._id.toString(), err.message);
      }
    }

    // Send order confirmation email (non-blocking)
    try {
      const user = await User.findById(req.user._id).select("name email");
      if (user) {
        await sendOrderConfirmation({
          toEmail: user.email,
          toName: user.name,
          order: { ...order.toObject(), user: { name: user.name, email: user.email } },
          attachments: invoiceAttachment,
        });
      }
    } catch (_) {}

    res.status(201).json(order);
  } catch (err) {
    if (err instanceof OrderInputError) return res.status(err.status).json({ message: err.message });
    res.status(500).json({ message: err.message || "Payment verification failed" });
  }
};

// @route  GET /api/payment/all
// @desc   List all payments (Razorpay paid orders + COD orders) for admin
// @access Admin
const getAllPayments = async (req, res) => {
  try {
    const { method, status, from, to } = req.query;
    const query = {};

    if (method === "razorpay" || method === "cod") query.paymentMethod = method;
    if (status) query.paymentStatus = status;

    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    // By default, show only orders where money actually moved or is owed
    if (!method && !status) {
      query.$or = [
        { paymentMethod: "razorpay", paymentStatus: { $in: ["paid", "refunded"] } },
        { paymentMethod: "cod" },
      ];
    }

    const orders = await Order.find(query)
      .populate("user", "name email phone")
      .sort({ paidAt: -1, createdAt: -1 })
      .select(
        "user orderNumber totalPrice paymentMethod paymentStatus razorpayOrderId razorpayPaymentId razorpaySignature paidAt status createdAt shippingAddress invoice"
      );

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  GET /api/payment/stats
// @desc   Payment summary stats for admin
// @access Admin
const getPaymentStats = async (req, res) => {
  try {
    const [razorpayRevenue] = await Order.aggregate([
      { $match: { paymentMethod: "razorpay", paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$totalPrice" }, count: { $sum: 1 } } },
    ]);

    const [codRevenue] = await Order.aggregate([
      { $match: { paymentMethod: "cod" } },
      { $group: { _id: null, total: { $sum: "$totalPrice" }, count: { $sum: 1 } } },
    ]);

    const [refundedRevenue] = await Order.aggregate([
      { $match: { paymentStatus: "refunded" } },
      { $group: { _id: null, total: { $sum: "$totalPrice" }, count: { $sum: 1 } } },
    ]);

    res.json({
      razorpay: { total: razorpayRevenue?.total || 0, count: razorpayRevenue?.count || 0 },
      cod: { total: codRevenue?.total || 0, count: codRevenue?.count || 0 },
      refunded: { total: refundedRevenue?.total || 0, count: refundedRevenue?.count || 0 },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  PUT /api/payment/:orderId/refund
// @desc   Mark an order as refunded (admin)
// @access Admin
const markRefunded = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.paymentStatus = "refunded";
    order.status = "Cancelled";
    const updated = await order.save();
    await releaseCouponForOrder(updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createRazorpayOrder,
  verifyPaymentAndCreateOrder,
  getAllPayments,
  getPaymentStats,
  markRefunded,
};
