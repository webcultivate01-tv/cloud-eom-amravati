import { useEffect } from "react";
import { useLocation, matchPath } from "react-router-dom";
import { trackPageview } from "../utils/analytics";

const SITE = "Cloud Graphics";
const CITY = "Amravati";
const TAGLINE = `Custom Printing & Design, ${CITY}`;

/* The city is part of the brand here, not a decoration: the shop is competing to
   be *the* printing studio in Amravati, and the tab title is what a visitor sees
   in their history, their bookmarks and their search results. So every title on
   the site carries it — see withCity, which enforces that even for the titles
   pages build from their own data. */
const SITE_FULL = `${SITE} ${CITY}`;

/* Route → { title, description }.
   Order matters: the first pattern that matches the pathname wins, so put
   specific paths above the ones with params. */
const ROUTES = [
  {
    path: "/",
    title: `${SITE} ${CITY} — Custom Printed T-Shirts, Mugs & Corporate Gifts`,
    description:
      "Custom printing studio in Amravati. Personalised t-shirts, mugs, diaries, pens, ID cards and corporate merchandise — designed, printed and delivered across India.",
  },
  {
    path: "/products",
    title: `Shop Customisable Products — ${SITE_FULL}`,
    description:
      "Browse customisable products — printed t-shirts, mugs, diaries, pens, keychains, ID cards, photo frames and banners. Upload your artwork and order online.",
  },
  {
    path: "/products/:id",
    title: `Product Details — ${SITE_FULL}`,
    description: "Customise this product with your own design, photo or logo and order it online from Cloud Graphics Amravati.",
  },
  {
    path: "/services",
    title: `Graphic Design Services — Logo, Branding & Print Design | ${SITE_FULL}`,
    description:
      "Logo and identity design, brand kits, social media creatives, packaging, apparel graphics and press-ready print layouts — with all source files handed over.",
  },
  {
    path: "/about",
    title: `About Us — Custom Printing Studio in ${CITY} | ${SITE}`,
    description:
      "Cloud Graphics is a custom printing studio at Shivaji Chowk, Amravati. Design, print and delivery under one roof, with proof checks on every order.",
  },
  {
    path: "/contact",
    title: `Contact Us — Get a Printing Quote in ${CITY} | ${SITE}`,
    description: "Call, email or message Cloud Graphics in Amravati for custom printing and design enquiries. We reply within 24–48 hours.",
  },
  { path: "/cart", title: `Your Cart — ${SITE_FULL}` },
  { path: "/checkout", title: `Checkout — ${SITE_FULL}` },
  { path: "/orders", title: `My Orders — ${SITE_FULL}` },
  { path: "/favorites", title: `My Wishlist — ${SITE_FULL}` },
  { path: "/profile", title: `My Profile — ${SITE_FULL}` },
  { path: "/replacements", title: `Replacement Requests — ${SITE_FULL}` },
  { path: "/login", title: `Login — ${SITE_FULL}` },
  { path: "/register", title: `Create an Account — ${SITE_FULL}` },
  { path: "/forgot-password", title: `Reset Your Password — ${SITE_FULL}` },
  { path: "/terms", title: `Terms & Conditions — ${SITE_FULL}` },
  { path: "/shipping-policy", title: `Shipping Policy — ${SITE_FULL}` },
  { path: "/return-policy", title: `Return & Refund Policy — ${SITE_FULL}` },

  /* Admin */
  { path: "/admin/dashboard", title: `Dashboard — ${SITE_FULL} Admin` },
  { path: "/admin/products", title: `Manage Products — ${SITE_FULL} Admin` },
  { path: "/admin/orders", title: `Manage Orders — ${SITE_FULL} Admin` },
  { path: "/admin/payments", title: `Payments — ${SITE_FULL} Admin` },
  { path: "/admin/users", title: `Manage Users — ${SITE_FULL} Admin` },
  { path: "/admin/admins", title: `Manage Admins — ${SITE_FULL} Admin` },
  { path: "/admin/events", title: `Manage Events — ${SITE_FULL} Admin` },
  { path: "/admin/categories", title: `Manage Categories — ${SITE_FULL} Admin` },
  { path: "/admin/inquiries", title: `Enquiries — ${SITE_FULL} Admin` },
  { path: "/admin/reviews", title: `Manage Reviews — ${SITE_FULL} Admin` },
  { path: "/admin/replacements", title: `Replacement Requests — ${SITE_FULL} Admin` },
  { path: "/admin/export", title: `Data Export — ${SITE_FULL} Admin` },
];

const FALLBACK = { title: `Page Not Found — ${SITE_FULL}` };

/* The one place that guarantees the city is in the title. Pages that build a
   title from their own data (a product name, say) go through applyPageMeta too,
   so none of them can quietly drop it. */
const withCity = (title) =>
  title.includes(CITY) ? title : `${title} | ${CITY}`;

/* Writes (or creates) a <meta> tag in the document head. */
function setMeta(attr, key, content) {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

/* Applies a title + description to the document. Exported so pages with
   dynamic content (a product name, say) can override the route default. */
export function applyPageMeta(title, description) {
  if (title) {
    const full = withCity(title);
    document.title = full;
    setMeta("property", "og:title", full);
  }
  if (description) {
    setMeta("name", "description", description);
    setMeta("property", "og:description", description);
  }
}

export function usePageTitle(title, description) {
  useEffect(() => {
    applyPageMeta(title, description);
  }, [title, description]);
}

/* Mounted once inside the router — keeps the tab title in step with the URL. */
export default function PageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const match =
      ROUTES.find((r) => matchPath({ path: r.path, end: true }, pathname)) || FALLBACK;
    applyPageMeta(match.title, match.description || `${SITE} — ${TAGLINE}`);
    trackPageview(pathname, withCity(match.title));
  }, [pathname]);

  return null;
}
