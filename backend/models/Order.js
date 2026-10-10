const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  // Delivery charge per unit, frozen at order time (like price)
  deliveryCharge: { type: Number, default: 0, min: 0 },
  size: { type: String, default: "" },
  uploadedImage: { type: String, default: "" },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [orderItemSchema],

    // Customer-facing order number ("2026-0001", "2026-0002"...) — issued
    // once at order placement and shown on the bill in place of the raw
    // database ID. Distinct from the GST invoice number below. No default:
    // orders placed before this field existed must leave it genuinely
    // unset (not ""), or the sparse unique index below would treat every
    // one of them as sharing the same "" value the next time one is saved.
    orderNumber: { type: String, index: true, sparse: true, unique: true },

    shippingAddress: {
      fullName:    { type: String, required: true },
      phone:       { type: String, required: true },
      address:     { type: String, required: true },
      addressLine2:{ type: String, default: "" },
      landmark:    { type: String, default: "" },
      city:        { type: String, required: true },
      state:       { type: String, default: "" },
      pincode:     { type: String, required: true },
      addressType: { type: String, enum: ["Home", "Work", "Other"], default: "Home" },
    },

    // Product cost (sum of price × qty) and delivery charges, kept separately
    // so the bill can itemise them. totalPrice is always itemsTotal −
    // discount + deliveryCharge — the amount actually charged. Orders placed
    // before delivery charges existed have neither field; they read as 0 delivery.
    itemsTotal:     { type: Number, default: 0, min: 0 },
    deliveryCharge: { type: Number, default: 0, min: 0 },

    // Coupon discount, taken off the product cost: totalPrice = itemsTotal −
    // discount + deliveryCharge. The coupon's terms are frozen here so the bill
    // and reports stay right even if the coupon is edited or switched off later.
    // `released` marks that a cancelled order has already handed its use back.
    discount: { type: Number, default: 0, min: 0 },
    coupon: {
      code:          { type: String, default: "" },
      couponId:      { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", default: null },
      discountType:  { type: String, enum: ["", "percentage", "fixed"], default: "" },
      discountValue: { type: Number, default: 0 },
      released:      { type: Boolean, default: false },
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["Pending", "Processing", "Printing", "Ready for Delivery", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },

    customerNote: {
      type: String,
      default: "",
    },

    // Payment info
    paymentMethod: {
      type: String,
      enum: ["razorpay", "cod"],
      default: "cod",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    razorpayOrderId:   { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    razorpaySignature: { type: String, default: "" },
    paidAt: { type: Date, default: null },

    // How a COD payment was actually handed over on delivery — set by the
    // admin at the moment they mark the order Delivered. Distinct from
    // paymentMethod, which only says how the order was placed (cod/razorpay).
    paymentCollectedVia: { type: String, enum: ["", "cash", "upi", "card"], default: "" },

    // Set when admin marks the order as Delivered — used for 7-day replacement window
    deliveredAt: { type: Date, default: null },

    // Tax invoice. The number is issued once — on delivery, or the first time
    // an admin downloads the bill — and never changes afterwards, because a
    // GST invoice number that moves is worse than no number at all.
    invoice: {
      number:   { type: String, default: "" },
      issuedAt: { type: Date,   default: null },
    },

    // Set once the customer's print artwork has been compressed for long-term
    // storage, which happens automatically on delivery. The full-resolution file
    // is only needed up to the moment the order ships.
    artworkArchivedAt: { type: Date, default: null },

    // Cancellation OTP (cleared after use)
    cancelOTP:       { type: String, default: null },
    cancelOTPExpiry: { type: Date,   default: null },

    // Who cancelled: 'user' = customer self-cancelled, 'admin' = admin cancelled
    cancelledBy: { type: String, enum: ["user", "admin"], default: null },

    // Filled when admin ships via Shiprocket
    shipment: {
      shiprocketOrderId: { type: String, default: "" },
      shipmentId:  { type: String, default: "" },
      trackingId:  { type: String, default: "" },
      courierName: { type: String, default: "" },
      shippedAt:   { type: Date, default: null },
    },
  },
  { timestamps: true }
);

// Per-customer coupon limits and the coupon usage history look orders up by code
orderSchema.index({ "coupon.code": 1, user: 1 });

module.exports = mongoose.model("Order", orderSchema);
