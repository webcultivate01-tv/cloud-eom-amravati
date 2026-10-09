const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { requireModule } = require("../middleware/adminMiddleware");
const { getQuote, getZones, createZone, updateZone, deleteZone } = require("../controllers/deliveryController");

// Public
router.get("/quote", getQuote);

// Admin
router.get("/", protect, requireModule("delivery"), getZones);
router.post("/", protect, requireModule("delivery"), createZone);
router.put("/:id", protect, requireModule("delivery"), updateZone);
router.delete("/:id", protect, requireModule("delivery"), deleteZone);

module.exports = router;
