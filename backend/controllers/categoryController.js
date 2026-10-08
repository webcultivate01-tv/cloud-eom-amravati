const Category = require("../models/Category");
const { cleanupUnusedImages } = require("../config/imageCleanup");

const toSlug = (str) => str.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");

// @route GET /api/categories  (public — active only)
const getCategories = async (req, res) => {
  try {
    const cats = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    res.json(cats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route GET /api/categories/admin/all  (admin — all)
const getAllCategoriesAdmin = async (req, res) => {
  try {
    const cats = await Category.find().sort({ sortOrder: 1, name: 1 });
    res.json(cats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route POST /api/categories  (admin)
const createCategory = async (req, res) => {
  try {
    const { name, image, description, icon, sortOrder } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });

    const slug = toSlug(name);
    const exists = await Category.findOne({ slug });
    if (exists) return res.status(400).json({ message: "Category already exists" });

    const cat = await Category.create({ name, slug, image, description, icon, sortOrder });
    res.status(201).json(cat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route PUT /api/categories/:id  (admin)
const updateCategory = async (req, res) => {
  try {
    const { name, image, description, icon, isActive, showInNavbar, sortOrder } = req.body;
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: "Category not found" });

    // Snapshot before mutating — the replaced file is deleted after the save
    const previousImage = cat.image;

    if (name) { cat.name = name; cat.slug = toSlug(name); }
    if (image !== undefined) cat.image = image;
    if (description !== undefined) cat.description = description;
    if (icon !== undefined) cat.icon = icon;
    if (isActive !== undefined) cat.isActive = isActive;
    if (showInNavbar !== undefined) cat.showInNavbar = showInNavbar;
    if (sortOrder !== undefined) cat.sortOrder = sortOrder;

    const updated = await cat.save();
    // Old image is now unreferenced by this category — sweep it if nothing
    // else points at it
    if (previousImage && previousImage !== updated.image) {
      await cleanupUnusedImages([previousImage]);
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route DELETE /api/categories/:id  (admin)
const deleteCategory = async (req, res) => {
  try {
    const cat = await Category.findByIdAndDelete(req.params.id);
    if (!cat) return res.status(404).json({ message: "Category not found" });
    await cleanupUnusedImages([cat.image]);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Subcategory operations ────────────────────────────────────

// @route POST /api/categories/:id/subcategories  (admin)
const addSubcategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });

    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: "Category not found" });

    const slug = toSlug(name);
    const dupSub = cat.subcategories.find((s) => s.slug === slug);
    if (dupSub) return res.status(400).json({ message: "Subcategory already exists" });

    cat.subcategories.push({ name, slug });
    const updated = await cat.save();
    res.status(201).json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route PUT /api/categories/:id/subcategories/:subId  (admin)
const updateSubcategory = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: "Category not found" });

    const sub = cat.subcategories.id(req.params.subId);
    if (!sub) return res.status(404).json({ message: "Subcategory not found" });

    if (name) { sub.name = name; sub.slug = toSlug(name); }
    if (isActive !== undefined) sub.isActive = isActive;

    const updated = await cat.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route DELETE /api/categories/:id/subcategories/:subId  (admin)
const deleteSubcategory = async (req, res) => {
  try {
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: "Category not found" });

    cat.subcategories = cat.subcategories.filter(
      (s) => s._id.toString() !== req.params.subId
    );
    const updated = await cat.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getCategories,
  getAllCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
  addSubcategory,
  updateSubcategory,
  deleteSubcategory,
};
