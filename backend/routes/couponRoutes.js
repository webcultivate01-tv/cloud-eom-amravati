const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { requireModule } = require("../middleware/adminMiddleware");
const {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponUsage,
  validateCoupon,
} = require("../controllers/couponController");

// Customer: check a code against their cart (Apply button at checkout)
router.post("/validate", protect, validateCoupon);

// Admin
router.get("/", protect, requireModule("coupons"), getCoupons);
router.post("/", protect, requireModule("coupons"), createCoupon);
router.get("/:id/usage", protect, requireModule("coupons"), getCouponUsage);
router.put("/:id", protect, requireModule("coupons"), updateCoupon);
router.delete("/:id", protect, requireModule("coupons"), deleteCoupon);

module.exports = router;
