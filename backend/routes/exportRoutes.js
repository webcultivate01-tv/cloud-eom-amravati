const express = require("express");
const router  = express.Router();
const { exportData, exportCounts } = require("../controllers/exportController");
const { protect }  = require("../middleware/authMiddleware");
const { requireModule } = require("../middleware/adminMiddleware");

// All export routes are admin-only
router.get("/counts", protect, requireModule("export"), exportCounts);

// One handler for every dataset — orders, payments, users, products,
// reviews, inquiries, replacements, categories, events.
// Unknown types are rejected by the controller.
router.get("/:type", protect, requireModule("export"), exportData);

module.exports = router;
