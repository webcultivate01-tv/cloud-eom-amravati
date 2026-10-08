const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProductsAdmin,
} = require("../controllers/productController");
const { protect } = require("../middleware/authMiddleware");
const { requireModule } = require("../middleware/adminMiddleware");

// Public routes
router.get("/", getProducts);

// Admin only — must come before /:id to avoid conflict
router.get("/admin/all", protect, requireModule("products"), getAllProductsAdmin);

// Public route
router.get("/:id", getProductById);

// Admin routes — JSON body with images as URL array.
// Image URLs come either from /api/upload (stored in backend/uploads/products/<category>/<product>) or from external URLs pasted by admin.
router.post("/",    protect, requireModule("products"), createProduct);
router.put("/:id",  protect, requireModule("products"), updateProduct);
router.delete("/:id", protect, requireModule("products"), deleteProduct);

module.exports = router;
