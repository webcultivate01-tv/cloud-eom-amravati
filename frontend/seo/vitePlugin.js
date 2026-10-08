/* Build-time SEO output.

   After `vite build`, takes the built dist/index.html and writes one real HTML
   file per public route (dist/about/index.html, dist/photo-mug-printing-amravati/
   index.html, …) with that route's own <title>, description, canonical, Open Graph
   tags, JSON-LD and a readable HTML body inside #root. React replaces that body on
   load, so users see no difference — but crawlers get the content without running JS.

   Also emits sitemap.xml (core pages, landing pages and every available product,
   fetched from the API at build time) and robots.txt. */
import fs from "node:fs";
import path from "node:path";
import {
  SITE_URL, SITE_FULL, DEFAULT_OG_IMAGE, INDEXABLE_ROUTES, CORE_ROUTES,
  absUrl, buildPageSchema, buildLocalBusinessSchema, buildWebsiteSchema,
} from "./seo.config.js";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/* JSON inside <script>: "<" must be escaped so "</script>" in data can't end the tag. */
const jsonLd = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c");

const HEAD_START = "<!--SEO:HEAD-->";
const HEAD_END = "<!--/SEO:HEAD-->";
const HEAD_RE = /<!--SEO:HEAD-->[\s\S]*?<!--\/SEO:HEAD-->/;
const ROOT_MARK = "<!--SEO:ROOT-->";

export function headBlock(route) {
  const url = absUrl(route.path);
  const robots = route.index === false ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1";
  const lines = [
    `<title>${esc(route.title)}</title>`,
    route.description && `<meta name="description" content="${esc(route.description)}" />`,
    route.keywords?.length && `<meta name="keywords" content="${esc(route.keywords.join(", "))}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${esc(route.title)}" />`,
    route.description && `<meta property="og:description" content="${esc(route.description)}" />`,
    `<meta property="og:image" content="${DEFAULT_OG_IMAGE}" />`,
    `<meta name="twitter:title" content="${esc(route.title)}" />`,
    route.description && `<meta name="twitter:description" content="${esc(route.description)}" />`,
    ...buildPageSchema(route).map((s) => `<script type="application/ld+json" data-seo="page">${jsonLd(s)}</script>`),
  ];
  return lines.filter(Boolean).join("\n    ");
}

/* Readable fallback body. Plain semantic HTML with minimal inline styling so it
   looks like a clean, fast first paint before React takes over. */
export function rootBlock(route) {
  const links = INDEXABLE_ROUTES.filter((r) => r.path !== route.path && r.path !== "/" && r.h1)
    .map((r) => `<li><a href="${r.path}">${esc(r.h1)}</a></li>`).join("");
  const sections = (route.sections || []).map((s) => `
      <section>
        <h2>${esc(s.h2)}</h2>
        ${s.body ? `<p>${esc(s.body)}</p>` : ""}
        ${s.bullets?.length ? `<ul>${s.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
      </section>`).join("");
  const faqs = route.faqs?.length
    ? `<section><h2>Frequently asked questions</h2>${route.faqs.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join("")}</section>`
    : "";
  return `<div style="max-width:880px;margin:0 auto;padding:32px 20px;font-family:Inter,system-ui,sans-serif;color:#0f172a;line-height:1.6">
      <header><a href="/" style="font-weight:800;color:#05618e;text-decoration:none">${esc(SITE_FULL)}</a></header>
      <main>
        <h1>${esc(route.h1 || route.title)}</h1>
        <p>${esc(route.intro || route.summary || route.description || "")}</p>
        ${sections}
        ${faqs}
        <p><a href="/products">Browse products</a> · <a href="/contact">Contact us</a> · Call <a href="tel:+919307641746">+91 93076 41746</a></p>
      </main>
      <nav aria-label="More from ${esc(SITE_FULL)}"><ul>${links}</ul></nav>
      <footer><p>${esc(SITE_FULL)}, Shivaji Chowk, Akoli Rd, Amravati, Maharashtra 444607.</p></footer>
    </div>`;
}

function applyRoute(html, route) {
  const head = `${HEAD_START}\n    ${headBlock(route)}\n    ${HEAD_END}`;
  return html.replace(HEAD_RE, () => head).replace(ROOT_MARK, () => rootBlock(route));
}

async function fetchProducts(apiUrl) {
  if (!apiUrl) return [];
  try {
    const res = await fetch(`${apiUrl.replace(/\/+$/, "")}/products`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn(`[seo] Could not fetch products for the sitemap (${err.message}). Product URLs are omitted — set SEO_API_URL to a reachable API and rebuild.`);
    return [];
  }
}

const urlEntry = (loc, { lastmod, changefreq, priority, image } = {}) => `  <url>
    <loc>${esc(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}${changefreq ? `\n    <changefreq>${changefreq}</changefreq>` : ""}${priority != null ? `\n    <priority>${priority}</priority>` : ""}${image ? `\n    <image:image><image:loc>${esc(image)}</image:loc></image:image>` : ""}
  </url>`;

export default function seoPlugin({ apiUrl } = {}) {
  let outDir = "dist";
  return {
    name: "cloud-graphics-seo",
    apply: "build",
    /* Fills the site-wide JSON-LD and the home route's head block from the config,
       in dev and build alike, so index.html never carries a hand-copied domain. */
    transformIndexHtml(html) {
      const home = CORE_ROUTES[0];
      return html
        .replace('__LOCAL_BUSINESS_JSONLD__', () => jsonLd(buildLocalBusinessSchema()))
        .replace('__WEBSITE_JSONLD__', () => jsonLd(buildWebsiteSchema()))
        .replace(HEAD_RE, () => `${HEAD_START}
    ${headBlock(home)}
    ${HEAD_END}`);
    },
    configResolved(cfg) {
      outDir = path.resolve(cfg.root, cfg.build.outDir);
    },
    async closeBundle() {
      const indexPath = path.join(outDir, "index.html");
      if (!fs.existsSync(indexPath)) return;
      const template = fs.readFileSync(indexPath, "utf8");
      if (!template.includes(HEAD_START) || !template.includes(ROOT_MARK)) {
        console.warn("[seo] index.html is missing the SEO markers — per-route pages were not generated.");
        return;
      }

      // Per-route static HTML. "/" overwrites dist/index.html with the home route's own block.
      for (const route of INDEXABLE_ROUTES) {
        const html = applyRoute(template, route);
        const file = route.path === "/" ? indexPath : path.join(outDir, route.path, "index.html");
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, html);
      }

      // Sitemap
      const today = new Date().toISOString().slice(0, 10);
      const products = await fetchProducts(apiUrl);
      const entries = INDEXABLE_ROUTES.map((r) =>
        urlEntry(absUrl(r.path), { lastmod: today, changefreq: r.changefreq || "weekly", priority: r.priority ?? 0.5 })
      );
      for (const p of products) {
        if (!p?._id) continue;
        const img = p.images?.[0] || p.image;
        entries.push(urlEntry(absUrl(`/products/${p._id}`), {
          lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString().slice(0, 10) : today,
          changefreq: "weekly",
          priority: 0.7,
          image: img && /^https?:/i.test(img) ? img : undefined,
        }));
      }
      fs.writeFileSync(
        path.join(outDir, "sitemap.xml"),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entries.join("\n")}\n</urlset>\n`
      );

      // robots.txt — keep crawlers on public pages; never block CSS/JS (Google needs them to render).
      fs.writeFileSync(
        path.join(outDir, "robots.txt"),
        [
          "User-agent: *",
          "Allow: /",
          "Disallow: /admin",
          "Disallow: /cart",
          "Disallow: /checkout",
          "Disallow: /orders",
          "Disallow: /profile",
          "Disallow: /favorites",
          "Disallow: /replacements",
          "Disallow: /login",
          "Disallow: /register",
          "Disallow: /forgot-password",
          "",
          `Sitemap: ${SITE_URL}/sitemap.xml`,
          "",
        ].join("\n")
      );

      console.log(`[seo] ${INDEXABLE_ROUTES.length} route pages, sitemap with ${entries.length} URLs (${products.length} products), robots.txt`);
    },
  };
}

