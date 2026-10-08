const express = require("express");
const router = express.Router();
const {
  getActiveEvents,
  getAllEventsAdmin,
  createEvent,
  updateEvent,
  deleteEvent,
} = require("../controllers/eventController");
const { protect } = require("../middleware/authMiddleware");
const { requireModule } = require("../middleware/adminMiddleware");

// Public — frontend displays active events
router.get("/", getActiveEvents);

// Admin routes — must come before /:id
router.get("/admin/all", protect, requireModule("events"), getAllEventsAdmin);
router.post("/", protect, requireModule("events"), createEvent);
router.put("/:id", protect, requireModule("events"), updateEvent);
router.delete("/:id", protect, requireModule("events"), deleteEvent);

module.exports = router;
