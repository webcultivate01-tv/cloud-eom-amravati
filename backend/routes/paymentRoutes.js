const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { requireModule, requireAnyModule } = require("../middleware/adminMiddleware");
const {
  createRazorpayOrder,
  verifyPaymentAndCreateOrder,
  getAllPayments,
  getPaymentStats,
  markRefunded,
} = require("../controllers/paymentController");

// User routes (must be logged in)
router.post("/create-order", protect, createRazorpayOrder);
router.post("/verify", protect, verifyPaymentAndCreateOrder);

// Admin routes
router.get("/all",   protect, requireModule("payments"), getAllPayments);
router.get("/stats", protect, requireAnyModule(["dashboard", "payments"]), getPaymentStats);
router.put("/:orderId/refund", protect, requireModule("payments"), markRefunded);

module.exports = router;
