const Coupon = require("../models/Coupon");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { round2 } = require("./company");

/**
 * Coupon rules in one place. The preview endpoint, COD checkout and the
 * online-payment flow all call these, so a coupon can never be accepted by
 * one and refused by another.
 */

/** A coupon the customer can't use. The message is written to be shown to them as is. */
class CouponError extends Error {}

const normalizeCode = (code) => String(code || "").trim().toUpperCase();

const rupees = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
const day = (d) => new Date(d).toLocaleDateString("en-IN", { dateStyle: "medium" });

/** The part of the cart the discount is worked out on — the whole product cost, or just the matching lines. */
const eligibleSubtotal = async (coupon, orderItems) => {
  const lineTotal = (i) => i.price * i.quantity;

  if (coupon.applicableTo === "products") {
    const ids = new Set(coupon.products.map(String));
    return round2(orderItems.filter((i) => ids.has(String(i.product))).reduce((s, i) => s + lineTotal(i), 0));
  }

  if (coupon.applicableTo === "categories") {
    const wanted = new Set(coupon.categories.map((c) => c.toLowerCase()));
    const products = await Product.find({ _id: { $in: orderItems.map((i) => i.product) } }).select("category");
    const categoryOf = new Map(products.map((p) => [String(p._id), String(p.category || "").toLowerCase()]));
    return round2(
      orderItems.filter((i) => wanted.has(categoryOf.get(String(i.product)))).reduce((s, i) => s + lineTotal(i), 0)
    );
  }

  return round2(orderItems.reduce((s, i) => s + lineTotal(i), 0));
};

/** Rupees off for a given eligible amount: the percentage (capped) or the flat amount, never more than the amount itself. */
const discountFor = (coupon, eligible) => {
  let discount = coupon.discountType === "percentage" ? (eligible * coupon.discountValue) / 100 : coupon.discountValue;
  if (coupon.discountType === "percentage" && coupon.maxDiscount > 0) {
    discount = Math.min(discount, coupon.maxDiscount);
  }
  return round2(Math.min(discount, eligible));
};

/**
 * Check a coupon code against a cart and work out the discount.
 *
 *   orderItems — lines priced from the DB ({ product, price, quantity })
 *   userId     — who is buying (for per-customer and new-customer rules)
 *   lenient    — skip the rules that can change while the customer is paying
 *                (active/dates/usage limits/who). Used only to re-derive a
 *                discount for a payment that was already accepted.
 *
 * Throws CouponError with a customer-readable reason; otherwise returns
 * { coupon, discount }.
 */
const applyCoupon = async ({ code, userId, orderItems, lenient = false }) => {
  const normalized = normalizeCode(code);
  if (!normalized) throw new CouponError("Enter a coupon code");

  const coupon = await Coupon.findOne({ code: normalized });
  if (!coupon || (!lenient && !coupon.isActive)) throw new CouponError("This coupon code is not valid");

  if (!lenient) {
    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      throw new CouponError(`This coupon is not active yet — it starts on ${day(coupon.startsAt)}`);
    }
    if (coupon.expiresAt && now > coupon.expiresAt) throw new CouponError("This coupon has expired");
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      throw new CouponError("This coupon has reached its usage limit");
    }
  }

  const productCost = round2(orderItems.reduce((s, i) => s + i.price * i.quantity, 0));
  if (coupon.minOrderValue > 0 && productCost < coupon.minOrderValue) {
    throw new CouponError(
      `Add ${rupees(round2(coupon.minOrderValue - productCost))} more to use this coupon (minimum order ${rupees(coupon.minOrderValue)})`
    );
  }

  const eligible = await eligibleSubtotal(coupon, orderItems);
  if (eligible <= 0) throw new CouponError("This coupon doesn't apply to the items in your cart");

  if (!lenient) {
    if (coupon.newCustomersOnly && (await Order.exists({ user: userId, status: { $ne: "Cancelled" } }))) {
      throw new CouponError("This coupon is only for new customers");
    }
    if (coupon.perUserLimit > 0) {
      const used = await Order.countDocuments({ user: userId, "coupon.code": coupon.code, status: { $ne: "Cancelled" } });
      if (used >= coupon.perUserLimit) {
        throw new CouponError(
          coupon.perUserLimit === 1
            ? "You have already used this coupon"
            : `You have already used this coupon ${coupon.perUserLimit} times`
        );
      }
    }
  }

  return { coupon, discount: discountFor(coupon, eligible) };
};

/**
 * Count one redemption. The total-usage limit is enforced in the update
 * itself, so two customers racing for the last use can't both get it.
 * `force` skips that check — for a customer who has already paid.
 */
const reserveCoupon = async (coupon, { force = false } = {}) => {
  const filter = { _id: coupon._id };
  if (!force && coupon.usageLimit > 0) filter.$expr = { $lt: ["$usedCount", "$usageLimit"] };

  const reserved = await Coupon.findOneAndUpdate(filter, { $inc: { usedCount: 1 } });
  if (!reserved) throw new CouponError("This coupon has reached its usage limit");
};

/** Hand a redemption back — used when an order fails to save. */
const returnCouponUse = async (couponId) => {
  await Coupon.updateOne({ _id: couponId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
};

/**
 * Give an order's coupon use back (the order was cancelled or refunded).
 * The order is flagged first, atomically, so calling this twice for the same
 * order — an admin cancel plus a refund, say — only ever returns one use.
 * Never throws: the cancellation it follows must not fail because of it.
 */
const releaseCouponForOrder = async (order) => {
  try {
    if (!order?.coupon?.code || !order.coupon.couponId) return;
    const claimed = await Order.updateOne(
      { _id: order._id, "coupon.released": { $ne: true } },
      { $set: { "coupon.released": true } }
    );
    if (claimed.modifiedCount === 1) await returnCouponUse(order.coupon.couponId);
  } catch (err) {
    console.error("Releasing coupon for order", String(order?._id), err.message);
  }
};

/**
 * The reverse of releaseCouponForOrder: an admin re-opened a cancelled order,
 * so it takes its coupon use back. Same atomic flag, so it only counts once.
 */
const reclaimCouponForOrder = async (order) => {
  try {
    if (!order?.coupon?.code || !order.coupon.couponId) return;
    const claimed = await Order.updateOne(
      { _id: order._id, "coupon.released": true },
      { $set: { "coupon.released": false } }
    );
    if (claimed.modifiedCount === 1) await Coupon.updateOne({ _id: order.coupon.couponId }, { $inc: { usedCount: 1 } });
  } catch (err) {
    console.error("Reclaiming coupon for order", String(order?._id), err.message);
  }
};

/** The coupon snapshot stored on an order, frozen at order time like prices are. */
const couponSnapshot = (coupon) => ({
  code: coupon.code,
  couponId: coupon._id,
  discountType: coupon.discountType,
  discountValue: coupon.discountValue,
  released: false,
});

module.exports = {
  CouponError,
  normalizeCode,
  applyCoupon,
  reserveCoupon,
  returnCouponUse,
  releaseCouponForOrder,
  reclaimCouponForOrder,
  couponSnapshot,
};
