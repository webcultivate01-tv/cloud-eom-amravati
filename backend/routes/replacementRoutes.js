const express = require("express");
const router  = express.Router();
const {
  createReplacement,
  getUserReplacements,
  getAllReplacements,
  approveReplacement,
  rejectReplacement,
  processReplacement,
  completeReplacement,
  deleteReplacement,
} = require("../controllers/replacementController");
const { protect }   = require("../middleware/authMiddleware");
const { requireModule } = require("../middleware/adminMiddleware");

// Admin: must come before /:id routes
router.get("/admin",    protect, requireModule("replacements"), getAllReplacements);

// User: submit request
router.post("/",        protect, createReplacement);

// User: own requests
router.get("/user",     protect, getUserReplacements);

// Admin: status actions
router.patch("/:id/approve",  protect, requireModule("replacements"), approveReplacement);
router.patch("/:id/reject",   protect, requireModule("replacements"), rejectReplacement);
router.patch("/:id/process",  protect, requireModule("replacements"), processReplacement);
router.patch("/:id/complete", protect, requireModule("replacements"), completeReplacement);

// Admin: delete
router.delete("/:id", protect, requireModule("replacements"), deleteReplacement);

module.exports = router;
