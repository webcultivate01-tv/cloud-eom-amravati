const path = require("path");
const {
  UPLOADS_ROOT,
  ALLOWED_FOLDERS,
  PROTECTED_FOLDERS,
  deleteLocalImage,
} = require("./localUpload");

const Product = require("../models/Product");
const Category = require("../models/Category");
const Event = require("../models/Event");
const HeroSlide = require("../models/HeroSlide");
const Replacement = require("../models/Replacement");
const Order = require("../models/Order");

// Every place in the database an /uploads URL can legitimately be referenced.
// Before a file is deleted, all of these are checked — if any document still
// points at it, the file stays. Adding a new image field to a model means
// adding it here too, otherwise its images can be swept up as orphans.
const IMAGE_REFERENCES = [
  { model: Product, fields: ["image", "images"] },
  { model: Category, fields: ["image"] },
  { model: Event, fields: ["image"] },
  { model: HeroSlide, fields: ["image"] },
  { model: Replacement, fields: ["images"] },
  // Customer print artwork. Also covered by the hard folder guard below, but
  // checked anyway so an order can never lose its artwork to a cleanup pass.
  { model: Order, fields: ["items.uploadedImage"] },
];

// Path inside uploads/ for a stored URL, or null when the URL is not one of
// ours. Host is deliberately ignored: BASE_URL and the deploy hostname change
// over a project's life, and URLs saved under an old host must still be
// recognised. The guard instead is that the path has to start with a real
// upload folder — "https://some-other-site.com/uploads/logo.png" resolves to
// no allowed folder and is left alone, and our filenames all carry a timestamp
// plus random suffix, so an external URL colliding with a real local file is
// not a practical concern.
const toUploadsPath = (imageUrl) => {
  const marker = "/uploads/";
  const raw = String(imageUrl || "").trim();
  const idx = raw.indexOf(marker);
  if (idx === -1) return null;

  const relative = raw.slice(idx + marker.length).split("?")[0].split("#")[0];
  if (!relative) return null;

  const [folder] = relative.split("/");
  if (!ALLOWED_FOLDERS.includes(folder)) return null;

  // Must resolve to a real path inside uploads/ — never above it
  const target = path.resolve(UPLOADS_ROOT, relative);
  if (!target.startsWith(UPLOADS_ROOT + path.sep)) return null;

  return relative;
};

// Customer artwork for a custom order is the file that gets printed, and an
// order keeps it as its record of what was ordered. Nothing in the automatic
// cleanup is ever allowed to touch it.
const isProtectedPath = (relative) =>
  PROTECTED_FOLDERS.includes(String(relative).split("/")[0]);

// Is this exact URL still stored on any document? Matching is exact-string:
// a false "yes" only leaves an orphan file behind (harmless), while a false
// "no" would delete an image a live page is rendering, so the comparison is
// deliberately the strict one.
const isStillReferenced = async (imageUrl) => {
  for (const { model, fields } of IMAGE_REFERENCES) {
    // A plain equality also matches when the field is an array of strings
    const found = await model.exists({ $or: fields.map((f) => ({ [f]: imageUrl })) });
    if (found) return true;
  }
  return false;
};

// Delete uploaded files that no document points at any more.
//
// Call this AFTER the owning document has been saved or removed, so the
// reference check sees the new state of the database — the image that was just
// replaced will no longer be found, while one that is still in use will be.
//
// Never throws: a cleanup problem must not fail an admin's save. Returns the
// paths that were actually deleted, which is what the tests assert on.
const cleanupUnusedImages = async (candidates = []) => {
  const list = Array.isArray(candidates) ? candidates : [candidates];
  const unique = [...new Set(list.filter(Boolean).map(String))];
  const removed = [];

  for (const imageUrl of unique) {
    try {
      const relative = toUploadsPath(imageUrl);
      if (!relative) continue; // external or pasted URL — not ours to delete
      if (isProtectedPath(relative)) continue; // customer print artwork
      if (await isStillReferenced(imageUrl)) continue; // still in use somewhere
      if (deleteLocalImage(imageUrl)) removed.push(relative);
    } catch (error) {
      console.error(`Image cleanup skipped for ${imageUrl}: ${error.message}`);
    }
  }

  return removed;
};

module.exports = {
  cleanupUnusedImages,
  toUploadsPath,
  isProtectedPath,
  isStillReferenced,
  IMAGE_REFERENCES,
};
