const mongoose = require("mongoose");

const specSchema = new mongoose.Schema({ key: String, value: String }, { _id: false });

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },
    // Set > 0 to show a strikethrough original price and discount badge
    originalPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Delivery charge in ₹ per unit ordered. 0 = free delivery. Billed on top
    // of the product price at checkout and itemised separately on the bill.
    deliveryCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    brand: {
      type: String,
      default: "",
    },
    sku: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      required: [true, "Category is required"],
    },
    subcategory: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    images: {
      type: [String],
      default: [],
    },
    stock: {
      type: Number,
      default: 100,
      min: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    // true  → customer sees the image upload field
    allowCustomImage: {
      type: Boolean,
      default: false,
    },
    // true  → order CANNOT be placed without uploading a custom image
    requiresCustomImage: {
      type: Boolean,
      default: false,
    },
    // Allow Cash on Delivery for this product. Customisable items are usually
    // online-payment only (no COD), so admin can disable it per product.
    allowCOD: {
      type: Boolean,
      default: true,
    },
    // Available sizes (e.g. ["S", "M", "L", "XL"]). Empty array = no size choice.
    sizes: {
      type: [String],
      default: [],
    },
    // Bullet-point feature highlights shown on product page
    highlights: {
      type: [String],
      default: [],
    },
    // Key-value specification table (e.g. Material: Cotton, Size: A4)
    specifications: {
      type: [specSchema],
      default: [],
    },
    weight: {
      type: String,
      default: "",
    },
    returnPolicy: {
      type: String,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
