const path = require("path");
const fs = require("fs");
const multer = require("multer");

// Root of the local image store: backend/uploads
const UPLOADS_ROOT = path.join(__dirname, "..", "uploads");

// Every folder an image can land in. Anything else falls back to "misc".
const ALLOWED_FOLDERS = [
  "products",
  "categories",
  "events",
  "hero",
  "orders",
  "replacements",
  "reviews",
  "misc",
];

// Make sure uploads/ and every subfolder exists on boot
const ensureFolders = () => {
  ALLOWED_FOLDERS.forEach((folder) => {
    fs.mkdirSync(path.join(UPLOADS_ROOT, folder), { recursive: true });
  });
};
ensureFolders();

// Folders that get one sub-folder per customer, so a repeat customer's images
// all collect in the same place: uploads/orders/<customer>/<file>
const USER_SCOPED_FOLDERS = ["orders"];

// Folders laid out as <folder>/<category>/<product>/<file>, so every image of a
// product sits in its own folder, grouped under the category it belongs to:
//   uploads/products/mugs/magic-color-changing-mug/front-123.webp
const CATALOG_SCOPED_FOLDERS = ["products"];

// Used when an image is uploaded before its category/product name is known
// (admin picks the files before filling the form in). The product controller
// moves these into the right folder as soon as the product itself is saved.
const UNSORTED_CATEGORY = "uncategorized";
const UNSORTED_PRODUCT = "unassigned";

// Everything on this site ends up on a physical product — a mug, a t-shirt, a
// banner — and print needs the full original file. So no upload is ever
// re-encoded or downscaled: every image is written byte-for-byte as it was sent,
// and the size cap below is what keeps uploads/ under control instead.
//
// Folders the automatic cleanup must never touch. Customer print artwork is an
// order's record of what was bought, so it stays even if nothing links to it.
const PROTECTED_FOLDERS = ["orders"];

const slugify = (str) =>
  String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

// Per-customer folder name: readable name plus a short slice of their user id,
// so two customers with the same name never share a folder and the folder
// survives a later name change.
const userFolderName = (user) => {
  if (!user || !user._id) return "guest";
  const id = String(user._id);
  return `${slugify(user.name) || "customer"}-${id.slice(-8)}`;
};

// Folder one product's images live in, relative to uploads/. Both parts are
// slugified so whatever the admin typed ("Magic Color-Changing Mug!") becomes a
// safe single path segment, and a missing part falls back to a holding folder
// rather than collapsing the product into the category folder itself.
const productFolderName = (category, productName) => {
  const cat = slugify(category) || UNSORTED_CATEGORY;
  const product = slugify(productName) || UNSORTED_PRODUCT;
  return `products/${cat}/${product}`;
};

// Pick the destination folder from ?folder=... (query) or the form field,
// sanitised. Returns a path relative to uploads/, which may be nested.
const resolveFolder = (req) => {
  const raw = String(req.query.folder || req.body?.folder || "misc")
    .toLowerCase()
    .trim();
  const folder = ALLOWED_FOLDERS.includes(raw) ? raw : "misc";
  if (USER_SCOPED_FOLDERS.includes(folder)) {
    return `${folder}/${userFolderName(req.user)}`;
  }
  if (CATALOG_SCOPED_FOLDERS.includes(folder)) {
    // Category + product name are sent by the admin form alongside the file
    return productFolderName(
      req.query.category || req.body?.category,
      req.query.product || req.body?.product
    );
  }
  return folder;
};

const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".svg",
  ".avif",
  ".tiff",
  ".tif",
];

// Because nothing is compressed on the way in, the upload cap is the only thing
// keeping file sizes sane — 5 MB clears a print-quality photo or design file
// comfortably while stopping a raw camera dump. Exposed to the frontend by
// GET /api/upload/limits so the two never disagree.
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 5);
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

// Files are buffered in memory so sharp can re-encode them before anything
// reaches the disk — a failed conversion then leaves no half-written file behind.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed"));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

// Unique, readable, url-safe filename built from what was uploaded.
const buildFileName = (originalname, ext) => {
  const name = String(originalname || "");
  const base =
    path
      .basename(name, path.extname(name))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "image";
  return `${base}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
};

// Browsers send an extensionless or oddly-named file often enough that the
// mime type is the more reliable of the two. Prefer the uploaded extension when
// it is one we serve, fall back to the one the mime type implies, and only then
// to .jpg — the file itself is never converted, so this is purely about giving
// the stored file a name the browser will content-type correctly.
const MIME_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "image/avif": ".avif",
  "image/tiff": ".tiff",
  "image/bmp": ".bmp",
};

const safeExtension = (originalname, mimetype) => {
  const ext = path.extname(String(originalname || "")).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) return ext;
  return MIME_EXTENSIONS[String(mimetype || "").toLowerCase()] || ".jpg";
};

// Absolute URL that gets saved in MongoDB, e.g.
//   http://localhost:5000/uploads/products/mug/photo-mug/front-123.png
//   http://localhost:5000/uploads/orders/tejas-mehar-c33d9c19/artwork-123.png
const buildImageUrl = (req, file) => {
  const base = (process.env.BASE_URL || `${req.protocol}://${req.get("host")}`)
    .replace(/\/+$/, "");
  // Relative to uploads/, so nested per-customer folders survive
  const relative = path.relative(UPLOADS_ROOT, file.path).split(path.sep).join("/");
  return `${base}/uploads/${relative}`;
};

// Write one buffered upload into uploads/<folder>/ and hand back the absolute
// URL to store in MongoDB. The bytes are stored exactly as uploaded — resizing
// or re-encoding here would soften the very detail the print needs. Sets
// file.path so deleteLocalImage and anything else inspecting the multer file
// keeps working.
const saveImage = async (req, file) => {
  const folder = resolveFolder(req);
  const dir = path.join(UPLOADS_ROOT, folder);
  await fs.promises.mkdir(dir, { recursive: true });

  const ext = safeExtension(file.originalname, file.mimetype);
  const target = path.join(dir, buildFileName(file.originalname, ext));
  await fs.promises.writeFile(target, file.buffer);

  file.path = target;
  file.size = file.buffer.length;
  return buildImageUrl(req, file);
};

// Path inside uploads/ for a stored URL, or null when the URL does not point
// at our own upload store. The host is deliberately ignored — BASE_URL and the
// deploy hostname change over a project's life, and URLs saved under an older
// host still have to resolve.
const uploadsPathFromUrl = (imageUrl = "") => {
  const marker = "/uploads/";
  const raw = String(imageUrl || "").trim();
  const idx = raw.indexOf(marker);
  if (idx === -1) return null;
  const relative = raw.slice(idx + marker.length).split("?")[0].split("#")[0];
  if (!relative) return null;
  // Never escape the uploads root
  const target = path.resolve(UPLOADS_ROOT, relative);
  if (!target.startsWith(UPLOADS_ROOT + path.sep)) return null;
  return relative;
};

// Remove now-empty folders left behind after a file was moved or deleted,
// walking up until something non-empty or the uploads root is reached. A
// product folder should not linger once its last image is gone.
const pruneEmptyDirs = (startDir) => {
  let dir = path.resolve(startDir);
  while (dir.startsWith(UPLOADS_ROOT + path.sep)) {
    try {
      if (fs.readdirSync(dir).length > 0) return;
      fs.rmdirSync(dir);
    } catch {
      return;
    }
    dir = path.dirname(dir);
  }
};

// Move an already-stored image into a different folder under uploads/ and hand
// back the URL it should now be saved as. Used when a product is created or
// renamed, so its files follow it into products/<category>/<product>/.
//
// Returns the URL unchanged for anything it cannot or should not move: an
// external/pasted URL, a file that is already in the right place, or one that
// is missing from disk. The host and any prefix of the original URL are kept,
// so a URL stored under an older BASE_URL stays reachable exactly as before.
const moveLocalImage = (imageUrl = "", targetFolder = "") => {
  try {
    const relative = uploadsPathFromUrl(imageUrl);
    if (!relative) return imageUrl;

    const folder = String(targetFolder).replace(/^[/]+|[/]+$/g, "");
    if (!folder) return imageUrl;

    const currentFolder = path.posix.dirname(relative.split(path.sep).join("/"));
    if (currentFolder === folder) return imageUrl;

    const source = path.resolve(UPLOADS_ROOT, relative);
    const destDir = path.resolve(UPLOADS_ROOT, folder);
    if (!destDir.startsWith(UPLOADS_ROOT + path.sep)) return imageUrl;
    if (!fs.existsSync(source)) return imageUrl;

    fs.mkdirSync(destDir, { recursive: true });

    // Filenames already carry a timestamp and random suffix, so a clash here is
    // effectively impossible — but never overwrite another product's image.
    let fileName = path.basename(relative);
    let target = path.join(destDir, fileName);
    if (fs.existsSync(target)) {
      const ext = path.extname(fileName);
      fileName = `${path.basename(fileName, ext)}-${Date.now()}${ext}`;
      target = path.join(destDir, fileName);
    }

    try {
      fs.renameSync(source, target);
    } catch {
      // rename fails across devices/volumes — fall back to copy + unlink
      fs.copyFileSync(source, target);
      fs.unlinkSync(source);
    }

    pruneEmptyDirs(path.dirname(source));

    // Swap only the path after /uploads/, keeping scheme, host and any prefix
    const marker = "/uploads/";
    const idx = String(imageUrl).indexOf(marker);
    return `${imageUrl.slice(0, idx + marker.length)}${folder}/${fileName}`;
  } catch (error) {
    console.error(`Could not move ${imageUrl}: ${error.message}`);
    return imageUrl;
  }
};

// Delete a stored file given the URL previously saved in MongoDB. No-ops for
// external URLs (Cloudinary leftovers, pasted links) and missing files. The
// folder that held it is pruned when nothing else is left in it.
const deleteLocalImage = (imageUrl = "") => {
  try {
    const relative = uploadsPathFromUrl(imageUrl);
    if (!relative) return false;
    const target = path.resolve(UPLOADS_ROOT, relative);
    if (!fs.existsSync(target)) return false;
    fs.unlinkSync(target);
    pruneEmptyDirs(path.dirname(target));
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  upload,
  saveImage,
  buildImageUrl,
  deleteLocalImage,
  moveLocalImage,
  pruneEmptyDirs,
  uploadsPathFromUrl,
  productFolderName,
  resolveFolder,

  userFolderName,
  slugify,
  UPLOADS_ROOT,
  ALLOWED_FOLDERS,
  USER_SCOPED_FOLDERS,
  CATALOG_SCOPED_FOLDERS,
  PROTECTED_FOLDERS,
  MAX_UPLOAD_MB,
  MAX_UPLOAD_BYTES,
  ALLOWED_EXTENSIONS,
};
