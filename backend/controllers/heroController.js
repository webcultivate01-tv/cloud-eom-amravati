const HeroSlide = require("../models/HeroSlide");
const { cleanupUnusedImages } = require("../config/imageCleanup");

const FIELDS = ["image", "tag", "title", "cta", "link", "isActive", "sortOrder"];
const pick = (body) =>
  FIELDS.reduce((acc, f) => (body[f] !== undefined ? { ...acc, [f]: body[f] } : acc), {});

// @desc    Active slides for the homepage slider
// @route   GET /api/hero
// @access  Public
const getActiveSlides = async (req, res) => {
  try {
    const slides = await HeroSlide.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 });
    res.json(slides);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    All slides including hidden ones
// @route   GET /api/hero/admin/all
// @access  Admin
const getAllSlidesAdmin = async (req, res) => {
  try {
    const slides = await HeroSlide.find().sort({ sortOrder: 1, createdAt: 1 });
    res.json(slides);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/hero
// @access  Admin
const createSlide = async (req, res) => {
  try {
    const slide = await HeroSlide.create(pick(req.body));
    res.status(201).json(slide);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @route   PUT /api/hero/:id
// @access  Admin
const updateSlide = async (req, res) => {
  try {
    const before = await HeroSlide.findById(req.params.id).select("image").lean();
    const slide = await HeroSlide.findByIdAndUpdate(req.params.id, pick(req.body), {
      new: true,
      runValidators: true,
    });
    if (!slide) return res.status(404).json({ message: "Slide not found" });

    if (before?.image && before.image !== slide.image) {
      await cleanupUnusedImages([before.image]);
    }
    res.json(slide);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @route   DELETE /api/hero/:id
// @access  Admin
const deleteSlide = async (req, res) => {
  try {
    const slide = await HeroSlide.findByIdAndDelete(req.params.id);
    if (!slide) return res.status(404).json({ message: "Slide not found" });
    await cleanupUnusedImages([slide.image]);
    res.json({ message: "Slide deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getActiveSlides, getAllSlidesAdmin, createSlide, updateSlide, deleteSlide };
