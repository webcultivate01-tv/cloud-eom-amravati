const mongoose = require("mongoose");

// Homepage hero slider slides, managed from the admin panel
const heroSlideSchema = new mongoose.Schema(
  {
    // Background image (local /uploads URL or pasted URL)
    image:     { type: String, required: [true, "Slide image is required"] },
    // Small label under the headline, e.g. "Premium Mugs"
    tag:       { type: String, default: "", trim: true },
    // Headline — a line break in the text becomes a new line on the slide
    title:     { type: String, default: "" },
    // Button text and where it goes, e.g. /products?category=Cup
    cta:       { type: String, default: "Shop Now", trim: true },
    link:      { type: String, default: "/products", trim: true },
    isActive:  { type: Boolean, default: true },
    // Lower = shown first
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HeroSlide", heroSlideSchema);
