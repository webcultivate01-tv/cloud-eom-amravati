const express = require("express");
const router = express.Router();
const {
  getActiveSlides,
  getAllSlidesAdmin,
  createSlide,
  updateSlide,
  deleteSlide,
} = require("../controllers/heroController");
const { protect } = require("../middleware/authMiddleware");
const { requireModule } = require("../middleware/adminMiddleware");

// Public — the homepage slider
router.get("/", getActiveSlides);

// Admin routes — must come before /:id
router.get("/admin/all", protect, requireModule("hero"), getAllSlidesAdmin);
router.post("/", protect, requireModule("hero"), createSlide);
router.put("/:id", protect, requireModule("hero"), updateSlide);
router.delete("/:id", protect, requireModule("hero"), deleteSlide);

module.exports = router;
