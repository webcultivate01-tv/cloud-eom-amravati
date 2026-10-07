const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/orderController");
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

// Admin dashboard stats — must be before /:id
router.get("/admin/stats", protect, adminOnly, getDashboardStats);

// Admin: pending count + latest orders (sidebar badge / bell)
router.get("/admin/recent", protect, adminOnly, getRecentOrders);

// Admin: opening the Orders page clears the new-order badge
router.put("/admin/mark-seen", protect, adminOnly, markOrdersSeen);

// Admin: order counts per tab (Active / Delivered / Cancelled)
router.get("/admin/group-counts", protect, adminOnly, getOrderGroupCounts);

// Admin: view all orders
router.get("/", protect, adminOnly, getAllOrders);

// User: place order
router.post("/", protect, createOrder);

// User: view their own orders
router.get("/my", protect, getMyOrders);

// User or Admin: view single order
router.get("/:id", protect, getOrderById);

// User: request OTP to cancel order (sends email)
router.post("/:id/cancel-otp", protect, requestCancelOTP);

// User: verify OTP and cancel order
router.put("/:id/cancel", protect, cancelOrder);

// Admin: change order status
router.put("/:id/status", protect, adminOnly, updateOrderStatus);

module.exports = router;
