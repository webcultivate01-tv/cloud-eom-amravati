/* Thin wrapper around the gtag.js loaded in index.html. Every call is a no-op
   if gtag hasn't loaded (ad blockers, SSR, etc.) so callers never need to guard. */

export const GA_MEASUREMENT_ID = "G-0QCSY96E2F";

const hasGtag = () => typeof window !== "undefined" && typeof window.gtag === "function";

/* Fired on every route change — the SPA never reloads index.html, so gtag's
   own automatic pageview (sent once, on first load) would otherwise be the
   only one GA ever sees. */
export function trackPageview(path, title) {
  if (!hasGtag()) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title,
    page_location: window.location.href,
  });
}

/* GA4 ecommerce: fired when a product detail page finishes loading a product,
   so admins can see which products get the most views. */
export function trackViewItem(product) {
  if (!hasGtag() || !product) return;
  window.gtag("event", "view_item", {
    currency: "INR",
    value: product.price,
    items: [
      {
        item_id: product._id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        quantity: 1,
      },
    ],
  });
}
