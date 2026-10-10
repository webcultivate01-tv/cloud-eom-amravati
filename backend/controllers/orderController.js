const Razorpay = require("razorpay");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { sendCancelOTP, sendOrderConfirmation, sendOrderStatusUpdate } = require("../config/mailer");
const { archiveOrderArtwork } = require("../config/imageArchive");
const { ensureInvoiceNumber, isBillable } = require("./invoiceController");
const { renderInvoiceBuffer, invoiceFileName } = require("../config/invoice");
const { nextOrderNumber } = require("../models/Counter");
const { computeOrderTotals, findDeliveryZone } = require("../config/orderTotals");
const { hasModule } = require("../middleware/adminMiddleware");
const { CouponError, applyCoupon, reserveCoupon, returnCouponUse, releaseCouponForOrder, reclaimCouponForOrder, couponSnapshot } = require("../config/coupon");

const getRazorpay = () =>
  new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

// @desc    Place a new order
// @route   POST /api/orders
// @access  Private (logged-in users)
const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, customerNote, paymentMethod, couponCode } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items in order" });
    }

    /* This endpoint books Cash-on-Delivery orders only. An online order is
       created by POST /api/payment/verify, after the Razorpay signature has
       been checked — so an order that is meant to be paid for online can
       never exist unless the money actually arrived. Without this guard the
       endpoint would happily mint an unpaid "razorpay" order. */
    if (paymentMethod === "razorpay") {
      return res.status(400).json({
        message: "Online orders are confirmed only after payment succeeds. Please complete the payment to place this order.",
      });
    }

    // Build order items with current prices from DB
    const orderItems = [];
    const codBlockers = []; // products that don't allow COD

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product ${item.product} not found` });
      }
      if (!product.isAvailable) {
        return res.status(400).json({ message: `${product.name} is currently unavailable` });
      }

      // Size validation — if product offers sizes, customer must pick one
      if (product.sizes?.length > 0) {
        if (!item.size) {
          return res.status(400).json({ message: `Please select a size for "${product.name}"` });
        }
        if (!product.sizes.includes(item.size)) {
          return res.status(400).json({ message: `Invalid size "${item.size}" for "${product.name}"` });
        }
      }

      // Track products that disallow COD — used after the loop
      if (product.allowCOD === false) codBlockers.push(product.name);

      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        deliveryCharge: product.deliveryCharge || 0,
        quantity: item.quantity,
        size: item.size || "",
        uploadedImage: item.uploadedImage || "", // local /uploads URL from frontend upload
      });
    }

    // Block COD if any item disallows it
    if (paymentMethod === "cod" && codBlockers.length > 0) {
      return res.status(400).json({
        message: `Cash on Delivery is not available for: ${codBlockers.join(", ")}. Please pay online to place this order.`,
      });
    }

    /* Coupon: judged here against the real prices, never trusted from the
       browser. The use is counted before the order is saved (so the usage
       limit holds under simultaneous orders) and handed back if saving fails. */
    let applied = null;
    if (couponCode) {
      applied = await applyCoupon({ code: couponCode, userId: req.user._id, orderItems });
      await reserveCoupon(applied.coupon);
    }

    let order;
    try {
      order = await Order.create({
        user: req.user._id,
        orderNumber: await nextOrderNumber(),
        items: orderItems,
        shippingAddress,
        ...computeOrderTotals(orderItems, await findDeliveryZone(shippingAddress?.pincode), applied?.discount || 0),
        ...(applied ? { coupon: couponSnapshot(applied.coupon) } : {}),
        customerNote,
        paymentMethod: "cod",
        paymentStatus: "pending",
      });
    } catch (err) {
      if (applied) await returnCouponUse(applied.coupon._id);
      throw err;
    }

    // Send order confirmation email (non-blocking)
    try {
      const user = await User.findById(req.user._id).select("name email");
      if (user) {
        await sendOrderConfirmation({
          toEmail: user.email,
          toName: user.name,
          order: { ...order.toObject(), user: { name: user.name, email: user.email } },
        });
      }
    } catch (_) {}

    res.status(201).json(order);
  } catch (error) {
    if (error instanceof CouponError) return res.status(400).json({ message: error.message });
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get orders for the logged-in user
// @route   GET /api/orders/my
// @access  Private
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate("items.product", "name image category")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a specific order by ID (owner or admin)
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("items.product", "name image category subcategory brand sku description");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Only the owner, or staff holding the Orders module, can view the order
    if (order.user._id.toString() !== req.user._id.toString() && !hasModule(req.user, "orders")) {
      return res.status(403).json({ message: "Not authorized to view this order" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* Which statuses belong to each tab of the admin Orders screen.

   "active" is the working queue — everything still needing attention.
   Delivered and cancelled orders leave that queue and live in their own
   tabs, so a finished order never pads the list an admin works from. */
const ORDER_GROUPS = {
  active:    ["Pending", "Processing", "Printing", "Ready for Delivery", "Shipped"],
  pending:   ["Pending", "Processing"],
  printing:  ["Printing"],
  ready:     ["Ready for Delivery"],
  shipped:   ["Shipped"],
  delivered: ["Delivered"],
  cancelled: ["Cancelled"],
};

// @desc    Get all orders (admin) with optional date/status filters
// @route   GET /api/orders?group=active|delivered|cancelled&filter=today|3days|7days|30days&from=DATE&to=DATE
// @access  Admin
const getAllOrders = async (req, res) => {
  try {
    const { filter, from, to, status, group } = req.query;
    const query = {};

    // Date range filter
    const now = new Date();
    if (filter) {
      const daysMap = { today: 0, "3days": 3, "7days": 7, "30days": 30 };
      const days = daysMap[filter];
      if (days !== undefined) {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        if (days > 0) start.setDate(start.getDate() - days);
        query.createdAt = { $gte: start };
      }
    } else if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    /* Group first, then the status dropdown narrows within it. A status
       outside the current group would return nothing, so it is ignored
       rather than silently emptying the list. */
    const groupStatuses = ORDER_GROUPS[group];
    if (groupStatuses) {
      query.status = status && groupStatuses.includes(status)
        ? status
        : { $in: groupStatuses };
    } else if (status) {
      query.status = status;
    }

    /* Delivered and cancelled orders are most useful in the order they
       finished, not the order they were placed. */
    const sort = group === "delivered" ? { deliveredAt: -1, createdAt: -1 } : { createdAt: -1 };

    const orders = await Order.find(query)
      .populate("user", "name email phone")
      .populate("items.product", "name image category subcategory brand sku description")
      .sort(sort);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Pending-order count plus the latest orders, for the admin sidebar badge and bell
// @route   GET /api/orders/admin/recent
// @access  Admin
const getRecentOrders = async (req, res) => {
  try {
    let seenAt = req.user.ordersSeenAt;
    // First time this admin is seen: everything already in the system is old
    if (!seenAt) {
      seenAt = new Date();
      await User.findByIdAndUpdate(req.user._id, { ordersSeenAt: seenAt });
    }

    const filter = { createdAt: { $gt: seenAt } };
    const [newCount, recent] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter)
        .sort({ createdAt: -1 })
        .limit(8)
        .select("orderNumber totalPrice status paymentMethod paymentStatus createdAt shippingAddress.fullName items.name items.quantity")
        .lean(),
    ]);
    res.json({ newCount, recent });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin opened the Orders page: clear their "new order" count
// @route   PUT /api/orders/admin/mark-seen
// @access  Admin
const markOrdersSeen = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { ordersSeenAt: new Date() });
    res.json({ newCount: 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Order counts per admin tab, for the badges on the Orders screen
// @route   GET /api/orders/admin/group-counts
// @access  Admin
const getOrderGroupCounts = async (req, res) => {
  try {
    const rows = await Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const byStatus = Object.fromEntries(rows.map((r) => [r._id, r.count]));

    const counts = Object.fromEntries(
      Object.entries(ORDER_GROUPS).map(([group, statuses]) => [
        group,
        statuses.reduce((sum, s) => sum + (byStatus[s] || 0), 0),
      ])
    );

    res.json({ ...counts, byStatus });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order status (admin)
// @route   PUT /api/orders/:id/status
// @access  Admin
const PAYMENT_COLLECTION_METHODS = ["cash", "upi", "card"];

const updateOrderStatus = async (req, res) => {
  try {
    const { status, paymentCollectedVia } = req.body;
    const validStatuses = ["Pending", "Processing", "Printing", "Ready for Delivery", "Shipped", "Delivered", "Cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Fetch the order first to check if it was cancelled by the user
    const existing = await Order.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Order not found" });

    // If the user cancelled this order, admin cannot change its status
    if (existing.cancelledBy === "user") {
      return res.status(403).json({
        message: "This order was cancelled by the customer and cannot be modified.",
      });
    }

    // Delivery raises the numbered invoice, so a delivered order is final
    if (existing.status === "Delivered") {
      return res.status(403).json({
        message: "This order is already delivered and its status can no longer be changed.",
      });
    }

    const updateFields = { status };

    if (status === "Delivered") {
      /* Delivery settles a COD order: the courier hands over the parcel and
         collects the money at the same moment. But "collected" isn't good
         enough for the books — the admin must say how it came in (cash, UPI
         or card), so the invoice and the payments report can record it
         accurately rather than lumping every COD sale together as cash. */
      if (existing.paymentMethod === "cod" && existing.paymentStatus === "pending") {
        if (!PAYMENT_COLLECTION_METHODS.includes(paymentCollectedVia)) {
          return res.status(400).json({
            message: "Record how the payment was collected (Cash, UPI or Card) before marking this order Delivered.",
          });
        }
        updateFields.paymentStatus = "paid";
        updateFields.paidAt = new Date();
        updateFields.paymentCollectedVia = paymentCollectedVia;
      }

      updateFields.deliveredAt = new Date();
    }

    // Track admin cancellation
    if (status === "Cancelled") updateFields.cancelledBy = "admin";

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    )
      .populate("user", "name email phone")
      .populate("items.product", "image");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // A cancelled order gives its coupon use back (and takes it again if re-opened)
    if (status === "Cancelled") await releaseCouponForOrder(order);
    else if (existing.status === "Cancelled") await reclaimCouponForOrder(order);

    // The artwork has been printed and handed over, so the full-resolution file
    // is no longer needed — compress it for long-term storage. Deliberately
    // awaited but never allowed to throw: the order is already saved, and the
    // admin's status change must succeed whether or not this does.
    if (status === "Delivered") {
      await archiveOrderArtwork(order);
    }

    /* The bill is raised at the moment of delivery, which is when the sale
       is complete and the money is settled either way. Issuing it here —
       rather than on the first download — means the invoice number, the
       customer's copy and the GST report all appear at the same instant.
       A failure to number must not undo a delivery, so it is contained. */
    let invoiceAttachment = [];
    if (status === "Delivered" && isBillable(order)) {
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

    // Send status update email to the customer (non-blocking)
    try {
      if (order.user?.email) {
        await sendOrderStatusUpdate({
          toEmail: order.user.email,
          toName: order.user.name,
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          status,
          totalPrice: order.totalPrice,
          discount: order.discount,
          couponCode: order.coupon?.code,
          items: order.items,
          attachments: invoiceAttachment,
        });
      }
    } catch (_) {}

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin dashboard stats
// @route   GET /api/orders/admin/stats
// @access  Admin
const getDashboardStats = async (req, res) => {
  try {
    const User = require("../models/User");

    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalProducts = await require("../models/Product").countDocuments();

    // Sum revenue: paid online + all COD orders
    const revenueResult = await Order.aggregate([
      {
        $match: {
          $or: [
            { paymentStatus: "paid" },
            { paymentMethod: "cod", status: { $nin: ["Cancelled"] } },
          ],
        },
      },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Order count by status
    const statusCounts = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.json({ totalOrders, totalUsers, totalProducts, totalRevenue, statusCounts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send a 6-digit OTP to user's email to confirm cancellation
// @route   POST /api/orders/:id/cancel-otp
// @access  Private
const requestCancelOTP = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "name email");
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorised" });
    }

    const cancellable = ["Pending", "Processing"];
    if (!cancellable.includes(order.status)) {
      return res.status(400).json({ message: `Cannot cancel an order that is already "${order.status}"` });
    }

    // Generate 6-digit OTP, valid for 10 minutes
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    order.cancelOTP = otp;
    order.cancelOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await order.save();

    await sendCancelOTP({
      toEmail: order.user.email,
      toName: order.user.name,
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      otp,
    });

    res.json({ message: `OTP sent to ${order.user.email}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify OTP and cancel the order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: "OTP is required" });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorised to cancel this order" });
    }

    const cancellable = ["Pending", "Processing"];
    if (!cancellable.includes(order.status)) {
      return res.status(400).json({ message: `Cannot cancel an order that is already "${order.status}"` });
    }

    // Verify OTP
    if (!order.cancelOTP || !order.cancelOTPExpiry) {
      return res.status(400).json({ message: "No OTP requested. Please request a new OTP first." });
    }
    if (new Date() > order.cancelOTPExpiry) {
      order.cancelOTP = null; order.cancelOTPExpiry = null; await order.save();
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }
    if (order.cancelOTP !== otp.trim()) {
      return res.status(400).json({ message: "Invalid OTP. Please check and try again." });
    }

    // OTP valid — if the order was paid online, auto-refund via Razorpay
    if (
      order.paymentMethod === "razorpay" &&
      order.paymentStatus === "paid" &&
      order.razorpayPaymentId
    ) {
      try {
        await getRazorpay().payments.refund(order.razorpayPaymentId, {
          amount: Math.round(order.totalPrice * 100), // paise
          speed: "normal",
          notes: { reason: "Customer requested cancellation" },
        });
        order.paymentStatus = "refunded";
      } catch (refundErr) {
        console.error("Razorpay auto-refund failed:", refundErr.message);
        // Still cancel the order; admin can process refund manually
      }
    }

    order.status = "Cancelled";
    order.cancelledBy = "user";
    order.cancelOTP = null;
    order.cancelOTPExpiry = null;
    const updated = await order.save();
    await releaseCouponForOrder(updated);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  getRecentOrders,
  markOrdersSeen,
  getOrderGroupCounts,
  updateOrderStatus,
  getDashboardStats,
  requestCancelOTP,
  cancelOrder,
};
