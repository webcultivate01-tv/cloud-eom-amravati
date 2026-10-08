import { useEffect } from "react";
import { useLocation, matchPath } from "react-router-dom";
import { trackPageview } from "../utils/analytics";
import {
  SITE_FULL, CITY, DEFAULT_OG_IMAGE, ALL_ROUTES, absUrl, buildPageSchema,
} from "../../seo/seo.config";

/* Titles, descriptions and structured data live in seo/seo.config.js — the same
   file the build uses to write static HTML per route, so what a crawler reads
   without JavaScript and what this component sets on navigation never drift.

   This component covers client-side navigation (and routes with params, which
   have no static file): title, description, canonical, robots, Open Graph and
   JSON-LD all follow the URL. */

const PRODUCT_ROUTE = {
  path: "/products/:id",
  title: `Product Details — ${SITE_FULL}`,
  description: "Customise this product with your own design, photo or logo and order it online from Cloud Graphics Amravati.",
};
const NOT_FOUND = { title: `Page Not Found — ${SITE_FULL}`, index: false };
const ADMIN_TITLE = `${SITE_FULL} Admin`;
const STAFF_TITLE = `${SITE_FULL} Staff`;

/* The city is part of the brand: every title carries it, even titles pages build from their own data. */
const withCity = (title) => (title.includes(CITY) ? title : `${title} | ${CITY}`);

function upsert(selector, create) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
}

function setMeta(attr, key, content) {
  if (!content) return;
  upsert(`meta[${attr}="${key}"]`, () => {
    const m = document.createElement("meta");
    m.setAttribute(attr, key);
    return m;
  }).setAttribute("content", content);
}

function setCanonical(href) {
  upsert('link[rel="canonical"]', () => {
    const l = document.createElement("link");
    l.setAttribute("rel", "canonical");
    return l;
  }).setAttribute("href", href);
}

/* Replaces the page-level JSON-LD (breadcrumbs / service / FAQ / product).
   The site-wide LocalBusiness + WebSite blocks have no data-seo attribute and are left alone. */
function setPageSchema(schemas) {
  document.head.querySelectorAll('script[data-seo="page"]').forEach((n) => n.remove());
  schemas.filter(Boolean).forEach((s) => {
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.dataset.seo = "page";
    el.textContent = JSON.stringify(s).replace(/</g, "\\u003c");
    document.head.appendChild(el);
  });
}

/* Applies title + description (+ optional canonical path, indexability, schema).
   Exported so pages with dynamic content (a product, say) can override the route default. */
export function applyPageMeta(title, description, { path, index = true, schema } = {}) {
  if (title) {
    const full = withCity(title);
    document.title = full;
    setMeta("property", "og:title", full);
    setMeta("name", "twitter:title", full);
  }
  if (description) {
    setMeta("name", "description", description);
    setMeta("property", "og:description", description);
    setMeta("name", "twitter:description", description);
  }
  if (path) {
    setCanonical(absUrl(path));
    setMeta("property", "og:url", absUrl(path));
  }
  setMeta("name", "robots", index ? "index, follow, max-image-preview:large, max-snippet:-1" : "noindex, nofollow");
  if (schema !== undefined) setPageSchema(schema);
}

export function usePageTitle(title, description, opts) {
  const path = opts?.path;
  const index = opts?.index;
  const schema = opts?.schema;
  useEffect(() => {
    applyPageMeta(title, description, { path, index, schema });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path, index, JSON.stringify(schema)]);
}

/* Mounted once inside the router — keeps the head in step with the URL. */
export default function PageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isAdmin = pathname.startsWith("/admin");
    const isEmployee = pathname.startsWith("/employee");
    const isPanel = isAdmin || isEmployee;
    const route =
      ALL_ROUTES.find((r) => matchPath({ path: r.path, end: true }, pathname)) ||
      (matchPath({ path: PRODUCT_ROUTE.path, end: true }, pathname) ? PRODUCT_ROUTE : null) ||
      NOT_FOUND;

    const title = isAdmin ? ADMIN_TITLE : isEmployee ? STAFF_TITLE : route.title;
    const known = route !== NOT_FOUND;
    applyPageMeta(title, route.description || `${SITE_FULL} — Custom gifts, printing & graphic design in ${CITY}`, {
      path: known && !isPanel ? pathname : undefined,
      index: known && !isPanel && route.index !== false,
      // Product pages set their own Product schema once the product loads.
      schema: route === PRODUCT_ROUTE ? [] : buildPageSchema(route),
    });
    setMeta("property", "og:image", DEFAULT_OG_IMAGE);

    // Staff traffic would swamp the public numbers in GA, so it isn't reported.
    if (!isPanel) trackPageview(pathname, withCity(title));
  }, [pathname]);

  return null;
}
