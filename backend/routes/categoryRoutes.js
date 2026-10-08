const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { requireModule } = require("../middleware/adminMiddleware");
const {
  getCategories,
  getAllCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
  addSubcategory,
  updateSubcategory,
  deleteSubcategory,
} = require("../controllers/categoryController");

// Public
router.get("/", getCategories);

// Admin
router.get("/admin/all", protect, requireModule("categories"), getAllCategoriesAdmin);
router.post("/", protect, requireModule("categories"), createCategory);
router.put("/:id", protect, requireModule("categories"), updateCategory);
router.delete("/:id", protect, requireModule("categories"), deleteCategory);

// Subcategory admin routes
router.post("/:id/subcategories", protect, requireModule("categories"), addSubcategory);
router.put("/:id/subcategories/:subId", protect, requireModule("categories"), updateSubcategory);
router.delete("/:id/subcategories/:subId", protect, requireModule("categories"), deleteSubcategory);

module.exports = router;
