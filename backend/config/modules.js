/**
 * Panel modules — the single source of truth for what an employee can be
 * given access to.
 *
 * Every admin-side API route is tagged with one of these keys (see
 * `requireModule` in middleware/adminMiddleware.js), and the employee panel
 * builds its sidebar from the same list. Adding a module here, tagging the
 * routes and adding the page to the frontend's MODULE_META is all it takes.
 *
 * `key`   — stored on the employee's `permissions` array
 * `label` — shown to the admin when picking access
 * `group` — how the picker and the sidebar group the modules
 */
const MODULES = [
  { key: "dashboard",    label: "Dashboard",    group: "Overview",  desc: "Store overview, KPIs and charts" },
  { key: "orders",       label: "Orders",       group: "Overview",  desc: "View orders, update status, ship" },
  { key: "payments",     label: "Payments",     group: "Overview",  desc: "Payment records and refunds" },

  { key: "products",     label: "Products",     group: "Catalog",   desc: "Add, edit and delete products" },
  { key: "categories",   label: "Categories",   group: "Catalog",   desc: "Categories and subcategories" },
  { key: "delivery",     label: "Delivery Charges", group: "Catalog", desc: "Pincode-wise delivery rates" },
  { key: "coupons",      label: "Coupons",      group: "Catalog",   desc: "Discount codes and offers" },
  { key: "hero",        label: "Hero Section", group: "Catalog",   desc: "Homepage slider images" },
  { key: "events",       label: "Events",       group: "Catalog",   desc: "Offer / announcement popups" },

  { key: "users",        label: "Users",        group: "Customers", desc: "Customer accounts, block / delete" },
  { key: "inquiries",    label: "Enquiries",    group: "Customers", desc: "Read and reply to enquiries" },
  { key: "reviews",      label: "Reviews",      group: "Customers", desc: "Approve or remove reviews" },
  { key: "replacements", label: "Replacements", group: "Customers", desc: "Replacement requests" },

  { key: "reports",      label: "Reports",      group: "System",    desc: "Sales, GST and invoice reports" },
  { key: "export",       label: "Data Export",  group: "System",    desc: "Download raw data as CSV/Excel" },
];

const MODULE_KEYS = MODULES.map((m) => m.key);

/** Drops anything that isn't a known module key, and de-duplicates. */
const sanitizePermissions = (input) => {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.filter((k) => MODULE_KEYS.includes(k)))];
};

module.exports = { MODULES, MODULE_KEYS, sanitizePermissions };
