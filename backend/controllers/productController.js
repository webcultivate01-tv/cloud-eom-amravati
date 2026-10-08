const Product = require("../models/Product");
const { cleanupUnusedImages } = require("../config/imageCleanup");
const { organizeProductImages } = require("../config/productImages");

// Accept either a real array, or a JSON-stringified array (legacy multipart callers).
const toArray = (val, fallback = []) => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : fallback; }
    catch { return fallback; }
  }
  return fallback;
};

// @desc    Get all available products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const { category, subcategory, search } = req.query;
    let filter = { isAvailable: true };

    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (search) filter.name = { $regex: search, $options: "i" };

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new product
//          Images come in as a URL array (`images: [url, url, ...]`).
//          Each URL is either a local /uploads URL produced by /api/upload,
//          or any external URL the admin pasted directly.
// @route   POST /api/products
// @access  Admin
const createProduct = async (req, res) => {
  try {
    const {
      name, description, price, originalPrice, deliveryCharge,
      brand, sku, category, stock,
      allowCustomImage, requiresCustomImage, allowCOD,
      weight, returnPolicy,
    } = req.body;

    // Admin uploads the files before (or while) filling the form in, so they
    // may have landed in the holding folder or under a category that has since
    // been changed in the dropdown. Settle them under the product's own folder
    // — uploads/products/<category>/<product>/ — before the URLs are stored.
    const images         = await organizeProductImages(
      toArray(req.body.images, []),
      { category, name }
    );
    const sizes          = toArray(req.body.sizes, []);
    const highlights     = toArray(req.body.highlights, []);
    const specifications = toArray(req.body.specifications, []);
    const tags           = toArray(req.body.tags, []);

    const product = await Product.create({
      name,
      description,
      price,
      originalPrice: Number(originalPrice) || 0,
      deliveryCharge: Math.max(Number(deliveryCharge) || 0, 0),
      brand: brand || "",
      sku: sku || "",
      category,
      stock,
      allowCustomImage,
      requiresCustomImage,
      allowCOD: allowCOD !== undefined ? allowCOD : true,
      sizes,
      image: images[0] || "",
      images,
      highlights,
      specifications,
      tags,
      weight: weight || "",
      returnPolicy: returnPolicy || "",
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Admin
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Snapshot every image the product currently holds, before any of the
    // fields below are overwritten. Whatever the admin drops from the gallery
    // is swept from uploads/ once the save succeeds.
    const previousImages = [product.image, ...product.images];

    const {
      name, description, price, originalPrice, deliveryCharge,
      brand, sku, category, stock,
      isAvailable, allowCustomImage, requiresCustomImage, allowCOD,
      weight, returnPolicy,
    } = req.body;

    // Replace the full images list when the client sends one.
    if (req.body.images !== undefined) {
      const images = toArray(req.body.images, []);
      product.images = images;
      product.image  = images[0] || "";
    }

    product.name               = name               ?? product.name;
    product.description        = description        ?? product.description;
    product.price              = price              ?? product.price;
    product.originalPrice      = originalPrice !== undefined ? Number(originalPrice) : product.originalPrice;
    product.deliveryCharge     = deliveryCharge !== undefined ? Math.max(Number(deliveryCharge) || 0, 0) : product.deliveryCharge;
    product.brand              = brand              ?? product.brand;
    product.sku                = sku                ?? product.sku;
    product.category           = category           ?? product.category;
    product.stock              = stock              ?? product.stock;
    product.isAvailable        = isAvailable        ?? product.isAvailable;
    product.allowCustomImage   = allowCustomImage   ?? product.allowCustomImage;
    product.requiresCustomImage= requiresCustomImage?? product.requiresCustomImage;
    product.allowCOD           = allowCOD           ?? product.allowCOD;
    product.weight             = weight             ?? product.weight;
    product.returnPolicy       = returnPolicy       ?? product.returnPolicy;

    if (req.body.sizes !== undefined)
      product.sizes = toArray(req.body.sizes, product.sizes);
    if (req.body.highlights !== undefined)
      product.highlights = toArray(req.body.highlights, product.highlights);
    if (req.body.specifications !== undefined)
      product.specifications = toArray(req.body.specifications, product.specifications);
    if (req.body.tags !== undefined)
      product.tags = toArray(req.body.tags, product.tags);

    // Re-home the gallery against the product's *final* name and category, so a
    // rename or a move to another category takes the files with it and the
    // folder on disk keeps matching what the admin sees in the panel.
    const organized = await organizeProductImages(product.images, {
      category: product.category,
      name: product.name,
      productId: product._id,
    });
    product.images = organized;
    product.image  = organized[0] || "";

    const updated = await product.save();

    // Only the URLs the product no longer holds are candidates; cleanup then
    // re-checks each one against every other document before unlinking it.
    const stillUsed = new Set([updated.image, ...updated.images]);
    await cleanupUnusedImages(previousImages.filter((url) => !stillUsed.has(url)));

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Admin
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    await cleanupUnusedImages([product.image, ...product.images]);
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all products (including unavailable) for admin
// @route   GET /api/products/admin/all
// @access  Admin
const getAllProductsAdmin = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProductsAdmin,
};
