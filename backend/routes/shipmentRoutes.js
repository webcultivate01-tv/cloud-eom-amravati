const express = require("express");
const router  = express.Router();
const { shipOrder, getShipmentInfo, cancelShipment } = require("../controllers/shipmentController");
const { protect }   = require("../middleware/authMiddleware");
const { requireModule } = require("../middleware/adminMiddleware");

// Ship an order — admin triggers pickup scheduling
router.post("/:orderId",        protect, requireModule("orders"), shipOrder);

// Cancel a shipment on Shiprocket — admin only
router.post("/:orderId/cancel", protect, requireModule("orders"), cancelShipment);

// Get shipment tracking info — admin or order owner
router.get("/:orderId",         protect, getShipmentInfo);

module.exports = router;
