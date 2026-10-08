const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { requireModule } = require("../middleware/adminMiddleware");
const { getOverview, downloadReport, listReports } = require("../controllers/reportController");

// Every report is admin-only — they carry customer and revenue data
router.get("/",         protect, requireModule("reports"), listReports);
router.get("/overview", protect, requireModule("reports"), getOverview);

// sales | gst | invoices | payments | products
router.get("/:type",    protect, requireModule("reports"), downloadReport);

module.exports = router;
