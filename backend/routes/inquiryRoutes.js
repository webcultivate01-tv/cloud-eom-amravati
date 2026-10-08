const express = require("express");
const router = express.Router();
const {
  createInquiry,
  getAllInquiries,
  getPendingCount,
  deleteInquiry,
  respondToInquiry,
  updateInquiryStatus,
} = require("../controllers/inquiryController");
const { protect } = require("../middleware/authMiddleware");
const { requireModule } = require("../middleware/adminMiddleware");

// Public: submit inquiry
router.post("/", createInquiry);

// Admin: list all inquiries
router.get("/", protect, requireModule("inquiries"), getAllInquiries);

// Admin: pending count for notification badge
router.get("/pending-count", protect, requireModule("inquiries"), getPendingCount);

// Admin: delete inquiry
router.delete("/:id", protect, requireModule("inquiries"), deleteInquiry);

// Admin: respond to inquiry (sends the reply email)
router.patch("/:id/respond", protect, requireModule("inquiries"), respondToInquiry);

// Admin: move the enquiry along the pipeline / save working notes
router.patch("/:id/status", protect, requireModule("inquiries"), updateInquiryStatus);

module.exports = router;
