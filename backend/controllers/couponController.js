const mongoose = require("mongoose");
const Coupon = require("../models/Coupon");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { buildOrderItems, OrderInputError } = require("../config/orderTotals");
const { CouponError, normalizeCode, applyCoupon } = require("../config/coupon");
const { round2 } = require("../config/company");

/** Where a coupon stands right now — what the admin list shows as its badge. */
const couponState = (c, now = new Date()) => {
  if (!c.isActive) return "inactive";
  if (c.expiresAt && now > c.expiresAt) return "expired";
  if (c.usageLimit > 0 && c.usedCount >= c.usageLimit) return "exhausted";
  if (c.startsAt && now < c.startsAt) return "scheduled";
  return "active";
};

/** A problem with what the admin typed into the form, answered as a 400 with the message shown as is. */
class FormError extends Error {}

const toDate = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new FormError("Enter a valid date");
  return d;
};

const toAmount = (v, label) => {
  if (v === undefined || v === null || v === "") return 0;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new FormError(`${label} must be 0 or more`);
  return round2(n);
};

const toCount = (v, label) => {
  if (v === undefined || v === null || v === "") return 0;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new FormError(`${label} must be a whole number, 0 or more`);
  return n;
};

/**
 * Check and clean the form into the fields a coupon stores. On an update only
 * the fields that were sent are returned; `current` fills in the rest for the
 * checks that compare fields with each other.
 */
const readCouponForm = async (body, current = null) => {
  const data = {};
  const has = (k) => body[k] !== undefined;
  const merged = (k) => (has(k) ? body[k] : current?.[k]);

  if (!current) {
    const code = normalizeCode(body.code);
    if (!/^[A-Z0-9_-]{3,20}$/.test(code)) {
      throw new FormError("Code must be 3-20 characters: letters, numbers, - or _");
    }
    data.code = code;
  }

  if (has("description")) data.description = String(body.description || "").trim().slice(0, 200);
  if (has("isActive")) data.isActive = !!body.isActive;
  if (has("newCustomersOnly")) data.newCustomersOnly = !!body.newCustomersOnly;

  if (has("discountType") || has("discountValue") || !current) {
    const type = merged("discountType");
    if (!["percentage", "fixed"].includes(type)) throw new FormError("Choose percentage or fixed amount");
    const value = Number(merged("discountValue"));
    if (!Number.isFinite(value) || value <= 0) throw new FormError("Enter a discount greater than 0");
    if (type === "percentage" && value > 100) throw new FormError("A percentage discount can't be more than 100%");
    data.discountType = type;
    data.discountValue = round2(value);
    // The cap only means something on a percentage
    data.maxDiscount = type === "percentage" ? toAmount(merged("maxDiscount"), "Maximum discount") : 0;
  } else if (has("maxDiscount")) {
    data.maxDiscount = current.discountType === "percentage" ? toAmount(body.maxDiscount, "Maximum discount") : 0;
  }

  if (has("minOrderValue")) data.minOrderValue = toAmount(body.minOrderValue, "Minimum order value");
  if (has("usageLimit")) data.usageLimit = toCount(body.usageLimit, "Total usage limit");
  if (has("perUserLimit")) data.perUserLimit = toCount(body.perUserLimit, "Per-customer limit");

  if (has("startsAt")) data.startsAt = toDate(body.startsAt);
  if (has("expiresAt")) data.expiresAt = toDate(body.expiresAt);
  const startsAt = has("startsAt") ? data.startsAt : current?.startsAt;
  const expiresAt = has("expiresAt") ? data.expiresAt : current?.expiresAt;
  if (startsAt && expiresAt && expiresAt <= startsAt) throw new FormError("The expiry must be after the start date");

  if (has("applicableTo") || has("products") || has("categories") || !current) {
    const applicableTo = merged("applicableTo") || "all";
    if (!["all", "products", "categories"].includes(applicableTo)) throw new FormError("Choose what the coupon applies to");
    data.applicableTo = applicableTo;

    if (applicableTo === "products") {
      const ids = [...new Set((merged("products") || []).map(String))];
      if (ids.length === 0) throw new FormError("Pick at least one product");
      if (!ids.every((id) => mongoose.isValidObjectId(id))) throw new FormError("One of the chosen products is invalid");
      if ((await Product.countDocuments({ _id: { $in: ids } })) !== ids.length) {
        throw new FormError("One of the chosen products no longer exists");
      }
      data.products = ids;
      data.categories = [];
    } else if (applicableTo === "categories") {
      const names = [...new Set((merged("categories") || []).map((c) => String(c).trim()).filter(Boolean))];
      if (names.length === 0) throw new FormError("Pick at least one category");
      data.categories = names;
      data.products = [];
    } else {
      data.products = [];
      data.categories = [];
    }
  }

  return data;
};

const failure = (res, error) => {
  if (error instanceof FormError) return res.status(400).json({ message: error.message });
  if (error?.code === 11000) return res.status(400).json({ message: "That coupon code already exists" });
  if (error?.name === "ValidationError") return res.status(400).json({ message: error.message });
  return res.status(500).json({ message: error.message });
};

// @desc    All coupons with their status and how much they have been used
// @route   GET /api/coupons
// @access  Admin (coupons module)
const getCoupons = async (req, res) => {
  try {
    const [coupons, usage] = await Promise.all([
      Coupon.find().sort({ createdAt: -1 }).populate("products", "name").lean(),
      Order.aggregate([
        { $match: { "coupon.code": { $nin: ["", null] }, status: { $ne: "Cancelled" } } },
        { $group: { _id: "$coupon.code", orders: { $sum: 1 }, discount: { $sum: "$discount" }, revenue: { $sum: "$totalPrice" } } },
      ]),
    ]);
    const byCode = new Map(usage.map((u) => [u._id, u]));

    res.json(
      coupons.map((c) => {
        const u = byCode.get(c.code);
        return {
          ...c,
          state: couponState(c),
          stats: { orders: u?.orders || 0, discount: round2(u?.discount || 0), revenue: round2(u?.revenue || 0) },
        };
      })
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/coupons
// @access  Admin (coupons module)
const createCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.create(await readCouponForm(req.body));
    res.status(201).json(coupon);
  } catch (error) {
    failure(res, error);
  }
};

// @route   PUT /api/coupons/:id
// @desc    The code itself can't change — orders and limits are tied to it
// @access  Admin (coupons module)
const updateCoupon = async (req, res) => {
  try {
    const current = await Coupon.findById(req.params.id);
    if (!current) return res.status(404).json({ message: "Coupon not found" });

    const data = await readCouponForm(req.body, current);
    Object.assign(current, data);
    await current.save();
    res.json(current);
  } catch (error) {
    failure(res, error);
  }
};

// @route   DELETE /api/coupons/:id
// @desc    A coupon that has been used stays, switched off, so past orders and bills keep their record
// @access  Admin (coupons module)
const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });

    if (await Order.exists({ "coupon.couponId": coupon._id })) {
      return res.status(400).json({
        message: "This coupon has been used on orders, so it can't be deleted. Switch it to Inactive instead.",
      });
    }
    await coupon.deleteOne();
    res.json({ message: "Coupon deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Orders that used a coupon
// @route   GET /api/coupons/:id/usage
// @access  Admin (coupons module)
const getCouponUsage = async (req, res) => {
  try {
    const orders = await Order.find({ "coupon.couponId": req.params.id })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("user", "name email")
      .select("orderNumber user totalPrice discount status paymentMethod createdAt");
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check a code against the customer's cart and return the discount, for the Apply button at checkout
// @route   POST /api/coupons/validate
// @access  Private (logged-in users)
const validateCoupon = async (req, res) => {
  try {
    const { code, items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Your cart is empty" });
    }

    const orderItems = await buildOrderItems(items);
    const { coupon, discount } = await applyCoupon({ code, userId: req.user._id, orderItems });

    res.json({
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discount,
    });
  } catch (error) {
    if (error instanceof CouponError) return res.status(400).json({ message: error.message });
    if (error instanceof OrderInputError) return res.status(error.status).json({ message: error.message });
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getCoupons, createCoupon, updateCoupon, deleteCoupon, getCouponUsage, validateCoupon };
