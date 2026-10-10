const mongoose = require("mongoose");

/**
 * A discount code the admin hands out and customers type in at checkout.
 *
 * Every rule lives here on the coupon; the checks themselves are in
 * config/coupon.js so the order, payment and preview endpoints all judge a
 * coupon the same way. A value of 0 on any limit means "no limit".
 */
const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9_-]{3,20}$/, "Code must be 3-20 characters: letters, numbers, - or _"],
    },
    // Internal note for the admin, also shown to the customer once applied
    description: { type: String, default: "", trim: true, maxlength: 200 },

    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    // percentage → 1-100, fixed → rupees off
    discountValue: { type: Number, required: [true, "Discount value is required"], min: 0 },
    // Ceiling on a percentage discount ("20% off, up to ₹500"). 0 = no cap.
    maxDiscount: { type: Number, default: 0, min: 0 },

    // Product cost (before delivery) the order must reach for the coupon to work
    minOrderValue: { type: Number, default: 0, min: 0 },

    startsAt:  { type: Date, default: null },
    expiresAt: { type: Date, default: null },

    // Total redemptions across all customers, and per customer
    usageLimit:   { type: Number, default: 0, min: 0 },
    perUserLimit: { type: Number, default: 0, min: 0 },
    // Redemptions so far. Counted up when an order is placed and back down if
    // that order is cancelled, so a cancelled order gives its use back.
    usedCount: { type: Number, default: 0, min: 0 },

    // What the discount is worked out on
    applicableTo: { type: String, enum: ["all", "products", "categories"], default: "all" },
    products:     [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    categories:   [{ type: String, trim: true }],

    // Only customers who have never placed an order
    newCustomersOnly: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);
