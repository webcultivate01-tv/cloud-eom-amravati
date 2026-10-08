const express = require("express");
const router = express.Router();
const {
  createReview,
  getApprovedReviews,
  getAllReviews,
  approveReview,
  deleteReview,
} = require("../controllers/reviewController");
const { protect } = require("../middleware/authMiddleware");
const { requireModule } = require("../middleware/adminMiddleware");

// Admin: all reviews — must be defined before /:id routes
router.get("/admin", protect, requireModule("reviews"), getAllReviews);

// Public: submit review
router.post("/", createReview);

// Public: approved reviews only (homepage)
router.get("/", getApprovedReviews);

// Admin: approve
router.patch("/:id/approve", protect, requireModule("reviews"), approveReview);

// Admin: delete
router.delete("/:id", protect, requireModule("reviews"), deleteReview);

module.exports = router;
