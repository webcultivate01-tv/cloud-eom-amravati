const express = require("express");
const router = express.Router();
const {
  getModules,
  getAllEmployees,
  createEmployee,
  updateEmployee,
  toggleBlockEmployee,
  resetEmployeePassword,
  deleteEmployee,
} = require("../controllers/employeeController");
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

// Employee accounts are managed by admins only. An employee can never create
// an account or grant themselves a module, whatever access they hold.
router.get("/modules", protect, adminOnly, getModules);

router.get("/",  protect, adminOnly, getAllEmployees);
router.post("/", protect, adminOnly, createEmployee);

router.put("/:id",          protect, adminOnly, updateEmployee);
router.put("/:id/block",    protect, adminOnly, toggleBlockEmployee);
router.put("/:id/password", protect, adminOnly, resetEmployeePassword);
router.delete("/:id",       protect, adminOnly, deleteEmployee);

module.exports = router;
