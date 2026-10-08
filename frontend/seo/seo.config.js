/* global process */
/* Single source of truth for everything search engines see.

   Imported by two consumers, so it must stay plain ESM with no JSX or DOM:
     • src/components/PageTitle.jsx — applies title/meta/canonical/JSON-LD on route change
     • seo/vitePlugin.js            — writes a real HTML file per route at build time,
                                      plus sitemap.xml and robots.txt

   Why static HTML per route: this is a client-rendered SPA, so without it every URL
   ships the *same* <head> and an empty <div id="root"> until JavaScript runs. Google
   eventually renders JS, but Bing, social crawlers and AI crawlers mostly do not, and
   even Google indexes un-rendered HTML first. */

const viteEnv = (typeof import.meta !== "undefined" && import.meta.env) || {};
const nodeEnv = (typeof process !== "undefined" && process.env) || {};

/* The production origin. Override with VITE_SITE_URL if the live domain differs. */
export const SITE_URL = String(viteEnv.VITE_SITE_URL || nodeEnv.VITE_SITE_URL || "https://cloudgraphics.in").replace(/\/+$/, "");

export const SITE = "Cloud Graphics";
export const CITY = "Amravati";
export const SITE_FULL = `${SITE} ${CITY}`;

export const BUSINESS = {
  name: SITE_FULL,
  phone: "+91 93076 41746",
  phoneIntl: "+919307641746",
  email: "info@cloudgraphics.in",
  streetAddress: "Shivaji Chowk, Akoli Rd",
  locality: "Amravati",
  region: "Maharashtra",
  postalCode: "444607",
  country: "IN",
  lat: 20.8944121,
  lng: 77.7404454,
  hours: "Mon – Sat: 10 AM – 7 PM",
  sameAs: [
    "https://www.instagram.com/cloudgraphics.amravati",
    "https://www.facebook.com/cloudgraphics.amravati",
    "https://wa.me/919307641746",
  ],
  logo: `${SITE_URL}/favicon.png`,
};

export const DEFAULT_OG_IMAGE = `${SITE_URL}/favicon.png`;

export const absUrl = (path = "/") => `${SITE_URL}${path === "/" ? "/" : path.replace(/\/+$/, "")}`;

/* ───────────────────────── Core pages ─────────────────────────
   index:false → noindex + excluded from the sitemap (account / transactional pages). */
export const CORE_ROUTES = [
  {
    path: "/",
    title: `${SITE_FULL} — Custom Gifts, Printing & Graphic Design`,
    description:
      "Custom gift shop and graphic design studio in Amravati. Personalised mugs, t-shirts, photo frames, corporate gifts, logo design, visiting cards and printing — home delivery.",
    keywords: [
      "custom gift shop in Amravati", "personalized gifts Amravati", "customized gifts Amravati", "gift shop near me", "best gift shop in Amravati", "unique gifts Amravati",
      "photo mug printing Amravati", "customized mug Amravati", "magic mug Amravati", "personalized photo frame Amravati", "LED photo frame Amravati", "photo printing Amravati",
      "custom t-shirt printing Amravati", "personalized t shirt Amravati", "corporate gifts Amravati", "bulk customized gifts Amravati", "customized corporate gifts with logo Amravati",
      "birthday gifts Amravati", "anniversary gifts Amravati", "wedding gifts Amravati", "wedding return gifts Amravati", "return gifts Amravati", "valentine gifts Amravati", "rakhi gifts Amravati", "diwali gifts Amravati",
      "graphic designer in Amravati", "graphic design services Amravati", "best graphic designer in Amravati", "logo design Amravati", "logo designer in Amravati", "branding services Amravati",
      "visiting card design Amravati", "brochure design Amravati", "printing services Amravati", "visiting card printing Amravati", "flex printing Amravati", "digital printing Amravati",
    ],
    h1: "Custom Gift Shop, Printing & Graphic Design Studio in Amravati",
    summary:
      "Cloud Graphics at Shivaji Chowk, Amravati makes personalised gifts — photo mugs, t-shirts, frames, diaries, keychains — and offers graphic design and printing: logos, visiting cards, brochures, flex banners and wedding invitations. Order online with home delivery or visit the shop.",
    priority: 1.0,
    changefreq: "daily",
  },
  {
    path: "/products",
    title: `Shop Personalised Gifts & Custom Print Products | ${SITE_FULL}`,
    description:
      "Shop customisable mugs, t-shirts, photo frames, diaries, pens, keychains, ID cards and banners. Upload your photo or logo, preview and order online — Amravati & India delivery.",
    keywords: [
      "customized gifts Amravati", "personalized gifts online", "custom gifts home delivery Amravati", "customized mug Amravati", "photo mug printing Amravati", "magic mug Amravati",
      "personalized photo frame Amravati", "custom photo frame Amravati", "customized water bottle Amravati", "personalized diary Amravati", "t-shirt printing Amravati",
      "anniversary gifts Amravati", "personalized birthday gift Amravati",
    ],
    h1: "Personalised Gifts & Custom Print Products",
    summary: "Browse customisable mugs, t-shirts, photo frames, diaries, pens, keychains, ID cards and banners. Add your photo, name or logo and order online.",
    priority: 0.9,
    changefreq: "daily",
  },
  {
    path: "/services",
    title: `Graphic Design Services in ${CITY} — Logo, Branding & Print | ${SITE}`,
    description:
      "Graphic designer in Amravati for logos, branding, visiting cards, brochures, flex banners, social media posts and packaging — print-ready files and all source files handed over.",
    keywords: [
      "graphic design services Amravati", "graphic designer in Amravati", "freelance graphic designer Amravati", "best graphic designer in Amravati", "graphic design company Amravati",
      "affordable graphic designer Amravati", "graphic designer Maharashtra", "social media graphics designer", "freelance logo designer India", "branding services Amravati",
      "logo design Amravati", "logo designer in Amravati", "logo design price Amravati", "visiting card design Amravati", "business card design Amravati", "brochure design Amravati",
      "pamphlet design Amravati", "poster design Amravati", "banner flex design Amravati", "wedding invitation card design Amravati", "menu card design Amravati",
      "packaging label design Amravati", "social media post design Amravati", "printing services Amravati", "visiting card printing Amravati", "flex printing Amravati", "digital printing Amravati",
    ],
    h1: "Graphic Design Services in Amravati",
    summary: "Logo and identity design, brand kits, social media creatives, packaging and label design, and press-ready print layouts — designed and printed under one roof.",
    priority: 0.9,
    changefreq: "weekly",
  },
  {
    path: "/about",
    title: `About Us — Gift & Printing Studio in ${CITY} | ${SITE}`,
    description:
      "Cloud Graphics is a custom gift, printing and graphic design studio at Shivaji Chowk, Akoli Road, Amravati. Design, print and delivery under one roof with a proof check on every order.",
    keywords: ["gift shop in Amravati", "graphic design company Amravati"],
    h1: `About ${SITE_FULL}`,
    summary: "A custom gift, printing and graphic design studio at Shivaji Chowk, Akoli Road, Amravati — design, printing and delivery under one roof.",
    priority: 0.6,
    changefreq: "monthly",
  },
  {
    path: "/contact",
    title: `Contact ${SITE_FULL} — Call, WhatsApp or Visit the Shop`,
    description:
      "Contact Cloud Graphics, Shivaji Chowk, Akoli Rd, Amravati 444607. Call +91 93076 41746 for custom gifts, printing and graphic design quotes. Open Mon–Sat, 10 AM–7 PM.",
    keywords: ["gift shop Amravati contact number", "graphic designer Amravati contact number", "gift shop near me"],
    h1: `Contact ${SITE_FULL}`,
    summary: "Shivaji Chowk, Akoli Rd, Amravati, Maharashtra 444607. Phone +91 93076 41746. Open Monday to Saturday, 10 AM to 7 PM.",
    priority: 0.8,
    changefreq: "monthly",
  },
  { path: "/terms", title: `Terms & Conditions — ${SITE_FULL}`, description: "Terms and conditions for ordering custom gifts and printing from Cloud Graphics, Amravati.", h1: "Terms & Conditions", summary: "Terms for ordering from Cloud Graphics.", priority: 0.2, changefreq: "yearly" },
  { path: "/shipping-policy", title: `Shipping Policy — ${SITE_FULL}`, description: "Delivery times, charges and areas for custom gifts and printed products from Cloud Graphics, Amravati.", h1: "Shipping Policy", summary: "Delivery times, charges and areas.", priority: 0.2, changefreq: "yearly" },
  { path: "/return-policy", title: `Return & Refund Policy — ${SITE_FULL}`, description: "Return, replacement and refund policy for custom printed products from Cloud Graphics, Amravati.", h1: "Return & Refund Policy", summary: "Returns, replacements and refunds.", priority: 0.2, changefreq: "yearly" },

  /* Utility / transactional — never indexed */
  { path: "/cart", title: `Your Cart — ${SITE_FULL}`, index: false },
  { path: "/checkout", title: `Checkout — ${SITE_FULL}`, index: false },
  { path: "/orders", title: `My Orders — ${SITE_FULL}`, index: false },
  { path: "/favorites", title: `My Wishlist — ${SITE_FULL}`, index: false },
  { path: "/profile", title: `My Profile — ${SITE_FULL}`, index: false },
  { path: "/replacements", title: `Replacement Requests — ${SITE_FULL}`, index: false },
  { path: "/login", title: `Login — ${SITE_FULL}`, index: false },
  { path: "/register", title: `Create an Account — ${SITE_FULL}`, index: false },
  { path: "/forgot-password", title: `Reset Your Password — ${SITE_FULL}`, index: false },
];

/* What the business offers — feeds the LocalBusiness structured data and the
   search-engine-only keyword list. Nothing here is rendered on the site. */
const SERVICES = [
  "Custom and personalised gifts",
  "Photo mug printing and customised mugs",
  "Personalised photo frames and photo printing",
  "Custom t-shirt printing",
  "Corporate gifts with logo",
  "Birthday, wedding, anniversary and return gifts",
  "Graphic design services",
  "Logo design and branding",
  "Visiting card, brochure and print design",
  "Printing services",
];

export const INDEXABLE_ROUTES = CORE_ROUTES.filter((r) => r.index !== false);
export const ALL_ROUTES = CORE_ROUTES;

export const findRoute = (path) => ALL_ROUTES.find((r) => r.path === path);

/* ─────────────────────── Structured data ─────────────────────── */
export function buildLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#business`,
    name: SITE_FULL,
    url: `${SITE_URL}/`,
    image: DEFAULT_OG_IMAGE,
    logo: BUSINESS.logo,
    description:
      "Custom gift shop, printing studio and graphic design company in Amravati, Maharashtra — personalised gifts, photo mugs, t-shirts, corporate gifts, logo design, visiting cards and flex printing.",
    telephone: BUSINESS.phoneIntl,
    email: BUSINESS.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.streetAddress,
      addressLocality: BUSINESS.locality,
      addressRegion: BUSINESS.region,
      postalCode: BUSINESS.postalCode,
      addressCountry: BUSINESS.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: BUSINESS.lat, longitude: BUSINESS.lng },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "10:00",
        closes: "19:00",
      },
    ],
    areaServed: [
      { "@type": "City", name: "Amravati" },
      { "@type": "AdministrativeArea", name: "Maharashtra" },
      { "@type": "Country", name: "India" },
    ],
    sameAs: BUSINESS.sameAs.filter((u) => !u.includes("wa.me")),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Gifts, printing and design",
      itemListElement: SERVICES.map((name) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name },
      })),
    },
    knowsAbout: SERVICES,
  };
}

export function buildWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: SITE_FULL,
    inLanguage: "en-IN",
    publisher: { "@id": `${SITE_URL}/#business` },
  };
}

/* Page-level schema: breadcrumbs for every indexable inner page; Service + FAQ for landing pages. */
export function buildPageSchema(route) {
  if (!route || route.index === false) return [];
  const out = [];
  if (route.path !== "/") {
    out.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
        { "@type": "ListItem", position: 2, name: route.h1 || route.title, item: absUrl(route.path) },
      ],
    });
  }
  if (route.service) {
    out.push({
      "@context": "https://schema.org",
      "@type": "Service",
      name: route.service,
      serviceType: route.service,
      description: route.description,
      url: absUrl(route.path),
      provider: { "@id": `${SITE_URL}/#business` },
      areaServed: { "@type": "City", name: "Amravati" },
    });
  }
  if (route.faqs?.length) {
    out.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: route.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }
  return out;
}

export function buildProductSchema(product, url) {
  if (!product) return null;
  const images = (product.images?.length ? product.images : product.image ? [product.image] : [])
    .map((i) => (/^https?:/i.test(i) ? i : i.startsWith("/") ? `${SITE_URL}${i}` : i))
    .slice(0, 5);
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: String(product.description || product.name).slice(0, 5000),
    sku: product.sku || String(product._id),
    category: product.category,
    url,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "INR",
      price: String(product.price),
      availability: product.isAvailable === false || product.stock === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      seller: { "@id": `${SITE_URL}/#business` },
    },
  };
  if (images.length) schema.image = images;
  if (product.brand) schema.brand = { "@type": "Brand", name: product.brand };
  return schema;
}
