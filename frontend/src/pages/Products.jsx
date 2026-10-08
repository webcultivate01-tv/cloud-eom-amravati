import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import { Search, X, SlidersHorizontal, ChevronDown, ChevronRight } from "lucide-react";
import { fetchProducts } from "../features/products/productSlice";
import { fetchCategories } from "../features/categories/categorySlice";
import ProductCard from "../components/ProductCard";
import { OPEN_FILTERS_EVENT } from "../components/MobileBottomNav";

const BRAND = "#05618e";

/* Kept in step with .cg-drawer-out / .cg-overlay-out in index.css */
const DRAWER_EXIT_MS = 300;

const SORT_OPTIONS = [
  { label: "Newest First", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Name: A to Z", value: "name_asc" },
];

const TYPE_OPTIONS = [
  { label: "All", value: "" },
  { label: "Ready to Ship", value: "direct" },
  { label: "Customizable", value: "custom" },
];

/* The site navbar is sticky and its height changes with the viewport — the category
   strip only appears from 1024px up — so measure it rather than hard-code an offset. */
function useNavHeight() {
  const [height, setHeight] = useState(88);
  useEffect(() => {
    const nav = document.querySelector("[data-site-nav]");
    if (!nav) return;
    const measure = () => setHeight(nav.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);
  return height;
}

const SectionLabel = ({ children }) => (
  <div className="flex items-center gap-3 mb-2.5">
    <h3 className="text-[11.5px] font-black uppercase tracking-[0.2em] text-slate-900 whitespace-nowrap">
      {children}
    </h3>
    <span className="flex-1 h-px bg-slate-200" />
  </div>
);

const Shimmer = ({ className = "" }) => (
  <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/80 to-transparent" />
  </div>
);

const CardSkeleton = () => (
  <div className="rounded-2xl overflow-hidden bg-white ring-1 ring-slate-200/60">
    <Shimmer className="aspect-[4/5]" />
    <div className="p-4 md:p-5 space-y-2.5">
      <Shimmer className="h-2 w-1/3 rounded-full" />
      <Shimmer className="h-3.5 w-4/5 rounded-full" />
      <Shimmer className="h-5 w-1/2 rounded-full !mt-4" />
    </div>
  </div>
);

export default function Products() {
  const dispatch = useDispatch();
  const { items: products, loading } = useSelector((s) => s.products);
  const { items: categoryItems } = useSelector((s) => s.categories);
  const [searchParams, setSearchParams] = useSearchParams();
  const navHeight = useNavHeight();

  const activeCategory = searchParams.get("category") || "";
  const activeSubcategory = searchParams.get("subcategory") || "";
  const activeSearch = searchParams.get("search") || "";
  const activeType = searchParams.get("type") || "";
  const sort = searchParams.get("sort") || "newest";

  // `draft` is only set while the user is typing; otherwise the box mirrors the URL.
  const [draft, setDraft] = useState(null);
  const searchInput = draft ?? activeSearch;
  // Explicit open/closed overrides; a category with no entry follows the active filter.
  const [catToggles, setCatToggles] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerClosing, setDrawerClosing] = useState(false);

  const updateParams = useCallback((updates, replace = false) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([k, v]) => {
        if (v === null || v === undefined || v === "") next.delete(k);
        else next.set(k, v);
      });
      return next;
    }, { replace });
  }, [setSearchParams]);

  const clearAll = () => { setDraft(null); setSearchParams({}); };

  useEffect(() => { dispatch(fetchCategories()); }, [dispatch]);

  useEffect(() => {
    const filters = {};
    if (activeCategory) filters.category = activeCategory;
    if (activeSubcategory) filters.subcategory = activeSubcategory;
    if (activeSearch) filters.search = activeSearch;
    dispatch(fetchProducts(filters));
  }, [dispatch, activeCategory, activeSubcategory, activeSearch]);

  // Debounce typing so we don't refetch on every keystroke
  useEffect(() => {
    if (draft === null || draft === activeSearch) return;
    const t = setTimeout(() => { updateParams({ search: draft || null }, true); setDraft(null); }, 350);
    return () => clearTimeout(t);
  }, [draft, activeSearch, updateParams]);

  // The mobile bottom tab bar's Filters tab opens this page's drawer
  useEffect(() => {
    const open = () => setSidebarOpen(true);
    window.addEventListener(OPEN_FILTERS_EVENT, open);
    return () => window.removeEventListener(OPEN_FILTERS_EVENT, open);
  }, []);

  // Keep the drawer mounted through its slide-out so closing glides rather
  // than snapping; `drawerClosing` swaps in the reverse animation.
  useEffect(() => {
    if (sidebarOpen) { setDrawerMounted(true); setDrawerClosing(false); return; }
    setDrawerClosing(true);
    const t = setTimeout(() => { setDrawerMounted(false); setDrawerClosing(false); }, DRAWER_EXIT_MS);
    return () => clearTimeout(t);
  }, [sidebarOpen]);

  // Lock page scroll for as long as the drawer is on screen, exit included
  useEffect(() => {
    document.body.style.overflow = drawerMounted ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerMounted]);

  const isCatOpen = (name) => catToggles[name] ?? activeCategory === name;
  const toggleCat = (name) => setCatToggles((prev) => ({ ...prev, [name]: !isCatOpen(name) }));

  const visible = useMemo(() => {
    let list = products;
    if (activeType === "custom") list = list.filter((p) => p.requiresCustomImage);
    else if (activeType === "direct") list = list.filter((p) => !p.requiresCustomImage);
    return [...list].sort((a, b) => {
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      if (sort === "name_asc") return a.name.localeCompare(b.name);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [products, activeType, sort]);

  const activeCat = categoryItems.find((c) => c.name === activeCategory);
  const heading = activeSubcategory || activeCategory || "All Products";
  const subheading =
    activeCat?.description ||
    (activeSearch
      ? `Showing everything that matches "${activeSearch}".`
      : "Premium custom-printed gifts, made in Amravati. Browse a category or search to narrow things down.");

  const chips = [
    activeCategory && { label: activeCategory, clear: { category: null, subcategory: null } },
    activeSubcategory && { label: activeSubcategory, clear: { subcategory: null } },
    activeType && { label: TYPE_OPTIONS.find((t) => t.value === activeType)?.label, clear: { type: null } },
    activeSearch && { label: `"${activeSearch}"`, clear: { search: null } },
  ].filter(Boolean);

  const navRow = (active) =>
    `relative w-full flex items-center gap-2.5 text-left pl-2 pr-1.5 py-2 rounded-lg bg-transparent text-[15px] border-none cursor-pointer transition-colors duration-200 ${
      active ? "text-slate-900 font-extrabold" : "text-slate-700 font-semibold hover:text-slate-900"
    }`;

  const pill = (active) =>
    `px-3 py-1.5 rounded-full bg-white text-[13px] border cursor-pointer whitespace-nowrap transition-colors duration-200 ${
      active
        ? "border-slate-900 text-slate-900 font-bold"
        : "border-slate-200 text-slate-700 font-semibold hover:border-slate-400 hover:text-slate-900"
    }`;

  // A plain render function, not a component — keeps the search box from remounting
  // on every keystroke. Category rows are text-only with a chevron before each name;
  // `mobile` drops the search box and scroll-caps the list inside the drawer.
  const renderFilterPanel = (mobile = false) => (
    <div className="flex flex-col gap-6">
      {/* Search — desktop only; on mobile the navbar already carries a search icon */}
      {!mobile && (
        <div>
          <SectionLabel>Search</SectionLabel>
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              className="w-full pl-9 pr-8 py-2 rounded-full border border-slate-200 bg-white text-[12.5px] text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
              placeholder="Search products..."
              value={searchInput}
              onChange={(e) => setDraft(e.target.value)}
            />
            {searchInput && (
              <button
                aria-label="Clear search"
                onClick={() => setDraft("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-700 bg-transparent border-none cursor-pointer p-0.5 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Product type — the drawer shows only the two real types, each a toggle, and
          stays open so a category can be picked straight after */}
      <div>
        <SectionLabel>Product Type</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {(mobile ? TYPE_OPTIONS.filter((o) => o.value) : TYPE_OPTIONS).map((opt) => (
            <button
              key={opt.value || "all"}
              onClick={() => {
                updateParams({ type: activeType === opt.value ? null : opt.value || null });
                if (!mobile) setSidebarOpen(false);
              }}
              className={pill(activeType === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div>
        <SectionLabel>Categories</SectionLabel>
        {/* A long category list scrolls inside the drawer, with no visible scrollbar */}
        <div
          className={`flex flex-col gap-1 ${
            mobile ? "max-h-[46vh] overflow-y-auto overscroll-contain scrollbar-hide pr-0.5" : ""
          }`}
        >
          <button
            className={navRow(!activeCategory)}
            onClick={() => { updateParams({ category: null, subcategory: null }); setSidebarOpen(false); }}
          >
            <ChevronRight size={16} className={`shrink-0 ${!activeCategory ? "text-slate-900" : "text-slate-500"}`} />
            All Products
          </button>

          {categoryItems.map((cat) => {
            const subs = cat.subcategories?.filter((s) => s.isActive) || [];
            const isOpen = isCatOpen(cat.name);
            const isCatActive = activeCategory === cat.name && !activeSubcategory;
            const isBranchActive = activeCategory === cat.name;

            return (
              <div key={cat._id}>
                <div className="flex items-center gap-0.5">
                  <button
                    className={`${navRow(isCatActive)} flex-1 min-w-0`}
                    onClick={() => {
                      updateParams({ category: cat.name, subcategory: null });
                      if (subs.length) setCatToggles((prev) => ({ ...prev, [cat.name]: true }));
                      else setSidebarOpen(false);
                    }}
                  >
                    <ChevronRight size={16} className={`shrink-0 ${isCatActive ? "text-slate-900" : "text-slate-500"}`} />
                    <span className="truncate">{cat.name}</span>
                  </button>

                  {subs.length > 0 && (
                    <button
                      aria-label={`Toggle ${cat.name} subcategories`}
                      onClick={() => toggleCat(cat.name)}
                      className={`shrink-0 p-1.5 rounded-lg bg-transparent border-none cursor-pointer transition-colors ${
                        isBranchActive ? "text-slate-700" : "text-slate-300 hover:text-slate-700"
                      }`}
                    >
                      <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                  )}
                </div>

                {isOpen && subs.length > 0 && (
                  <div className={`ml-[14px] pl-3 mt-1 mb-1.5 border-l border-slate-200 flex flex-col items-start gap-0.5`}>
                    {subs.map((sub) => {
                      const isSubActive = activeCategory === cat.name && activeSubcategory === sub.name;
                      return (
                        <button
                          key={sub._id}
                          onClick={() => { updateParams({ category: cat.name, subcategory: sub.name }); setSidebarOpen(false); }}
                          className={`text-left px-2.5 py-1 rounded-full text-[14px] border-none bg-transparent cursor-pointer transition-colors duration-200 ${
                            isSubActive
                              ? "text-slate-900 font-extrabold"
                              : "text-slate-700 font-semibold hover:text-slate-900"
                          }`}
                        >
                          {sub.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>


      {chips.length > 0 && (
        <button
          onClick={() => { clearAll(); setSidebarOpen(false); }}
          className="self-start text-[12px] font-semibold text-slate-400 hover:text-brand-700 bg-transparent border-none cursor-pointer underline underline-offset-4 decoration-slate-300 hover:decoration-brand-700 transition-colors"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="bg-[#f7fafc] min-h-[calc(100vh_-_var(--nav-h))]" style={{ "--nav-h": navHeight + "px" }}>
      {/* ── Editorial header ── */}
      <header className="relative overflow-hidden bg-white border-b border-slate-200/70">
        <div className="pointer-events-none absolute -top-28 -right-20 w-72 h-72 rounded-full bg-brand-600/[0.06] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 w-64 h-64 rounded-full bg-amber-400/[0.05] blur-3xl" />

        <div className="relative max-w-[1400px] mx-auto px-4 md:px-8 pt-4 pb-6 md:pt-5 md:pb-7">
          <nav className="flex items-center gap-2 text-[13px] font-semibold text-slate-600 mb-3.5">
            <Link to="/" className="hover:text-brand-700 transition-colors">Home</Link>
            <span className="text-slate-500">/</span>
            <Link to="/products" className="hover:text-brand-700 transition-colors">Products</Link>
            {activeCategory && (
              <>
                <span className="text-slate-500">/</span>
                <span className={activeSubcategory ? "" : "text-slate-800"}>{activeCategory}</span>
              </>
            )}
            {activeSubcategory && (
              <>
                <span className="text-slate-500">/</span>
                <span className="text-slate-800">{activeSubcategory}</span>
              </>
            )}
          </nav>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-8 h-px bg-brand-700" />
              <span className="text-[11.5px] font-extrabold uppercase tracking-[0.28em] text-brand-700">
                {activeCategory ? "Collection" : "Shop All"}
              </span>
            </div>

            <h1 className="font-display text-[30px] md:text-[40px] font-black text-slate-900 leading-[1.08] tracking-[-0.02em]">
              {heading}
            </h1>

            <p className="text-slate-700 font-medium text-[14px] md:text-[15.5px] mt-2 max-w-xl leading-relaxed">
              {subheading}
            </p>

            <div className="flex items-center gap-2.5 mt-3.5 text-[12.5px] font-bold uppercase tracking-[0.16em] text-slate-600">
              <span>{loading ? "—" : visible.length} {visible.length === 1 ? "Item" : "Items"}</span>
              <span className="w-1 h-1 rounded-full bg-slate-500" />
              <span>Free design proof</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Category rail (mobile) — deliberately not sticky; the toolbar below owns that slot ── */}
      {categoryItems.length > 0 && (
        <div className="lg:hidden bg-white border-b border-slate-200/70">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3">
            <button className={pill(!activeCategory)} onClick={() => updateParams({ category: null, subcategory: null })}>
              All
            </button>
            {categoryItems.map((cat) => (
              <button
                key={cat._id}
                className={pill(activeCategory === cat.name)}
                onClick={() => updateParams({ category: cat.name, subcategory: null })}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex max-w-[1400px] mx-auto px-4 md:px-8 lg:gap-10">
        {/* ── Sidebar (desktop) ── */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-[var(--nav-h)] max-h-[calc(100vh_-_var(--nav-h))] overflow-y-auto scrollbar-hide py-6 pr-1">
            {renderFilterPanel()}
          </div>
        </aside>

        {/* ── Sidebar (mobile drawer) ──
             Portalled so the fixed panel is never clipped by the page's flex row,
             and themed to match the mobile account sheet (brand red on stone). */}
        {drawerMounted && createPortal(
          <div
            className="lg:hidden fixed inset-0 z-[300]"
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
          >
            <div
              className={`absolute inset-0 bg-black/45 backdrop-blur-[2px] ${drawerClosing ? "cg-overlay-out" : "cg-overlay-in"}`}
              onClick={() => setSidebarOpen(false)}
            />

            <div
              className={`absolute top-0 left-0 bottom-0 w-[86%] max-w-xs bg-white shadow-2xl flex flex-col overflow-hidden ${
                drawerClosing ? "cg-drawer-out" : "cg-drawer-in"
              }`}
            >
              {/* Same warm glow the page header uses */}
              <div className="pointer-events-none absolute -top-24 -right-16 w-56 h-56 rounded-full bg-brand-600/[0.07] blur-3xl" />

              <div className="relative flex items-start justify-between gap-3 px-5 pt-5 pb-4 shrink-0 border-b border-slate-100">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-px" style={{ background: BRAND }} />
                    <span className="text-[9px] font-black uppercase tracking-[0.26em]" style={{ color: BRAND }}>
                      Refine
                    </span>
                  </div>
                  <h2 className="font-display text-[20px] font-black text-slate-900 leading-none m-0">Filters</h2>
                  <p className="text-[11.5px] text-slate-400 mt-1.5 m-0">
                    {chips.length
                      ? `${chips.length} filter${chips.length === 1 ? "" : "s"} applied`
                      : "Narrow down the catalogue"}
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Close filters"
                  onClick={() => setSidebarOpen(false)}
                  className="w-8 h-8 shrink-0 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center border-none cursor-pointer active:scale-95 transition-transform"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Padding clears the mobile bottom tab bar under the drawer. */}
              <div
                className="relative flex-1 overflow-y-auto overscroll-contain px-5 pt-5"
                style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom))" }}
              >
                {renderFilterPanel(true)}
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ── Results ── */}
        <main className="flex-1 min-w-0 pb-16">
          {/* Glass toolbar */}
          <div className="sticky top-[var(--nav-h)] z-20 -mx-4 lg:mx-0 px-4 lg:px-0 lg:pt-9 bg-[#f7fafc]/95 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 py-3.5 lg:py-0 lg:pb-5 border-b border-slate-200/80">
              <p className="text-slate-500 text-[13px]">
                <span className="font-bold text-slate-900">{visible.length}</span>{" "}
                {visible.length === 1 ? "product" : "products"}
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3.5 py-2 text-[12.5px] font-semibold text-slate-700 cursor-pointer transition-colors hover:border-slate-900"
                >
                  <SlidersHorizontal size={14} />
                  Filters
                  {chips.length > 0 && (
                    <span className="ml-0.5 w-[18px] h-[18px] rounded-full bg-brand-700 text-white text-[10px] font-bold flex items-center justify-center">
                      {chips.length}
                    </span>
                  )}
                </button>

                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => updateParams({ sort: e.target.value === "newest" ? null : e.target.value })}
                    className="appearance-none rounded-full bg-white border border-slate-200 pl-4 pr-9 py-2 text-[12.5px] font-semibold text-slate-700 cursor-pointer outline-none transition-colors hover:border-slate-900 focus:border-slate-900"
                  >
                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Active filter chips */}
          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-5">
              {chips.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => { if ("search" in chip.clear) setDraft(null); updateParams(chip.clear); }}
                  className="group inline-flex items-center gap-2 pl-3.5 pr-2.5 py-1.5 rounded-full bg-white ring-1 ring-slate-200 text-slate-700 text-[12px] font-semibold cursor-pointer transition-all duration-200 hover:ring-brand-700 hover:text-brand-700"
                >
                  {chip.label}
                  <X size={12} strokeWidth={3} className="text-slate-400 group-hover:text-brand-700 transition-colors" />
                </button>
              ))}
              <button
                onClick={clearAll}
                className="text-[12px] font-semibold text-slate-400 hover:text-brand-700 bg-transparent border-none cursor-pointer px-1 underline underline-offset-4 decoration-slate-300 hover:decoration-brand-700 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Grid */}
          <div className="mt-7">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
                {[...Array(8)].map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center text-center py-24 px-6">
                <span className="w-20 h-20 rounded-full bg-white ring-1 ring-slate-200 shadow-[0_16px_40px_-24px_rgba(0,0,0,0.4)] flex items-center justify-center mb-6">
                  <Search size={26} className="text-brand-700" />
                </span>
                <h3 className="font-display text-2xl font-black text-slate-900 mb-2">Nothing here yet</h3>
                <p className="text-slate-500 text-[13px] max-w-xs leading-relaxed">
                  No products match these filters right now. Try clearing them or browsing another category.
                </p>
                {chips.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="mt-7 px-7 py-3 rounded-full bg-slate-900 text-white text-[13px] font-bold border-none cursor-pointer transition-colors duration-200 hover:bg-brand-700"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
                {visible.map((p, i) => (
                  <div
                    key={p._id}
                    className="h-full animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(i, 11) * 45}ms`, animationFillMode: "both" }}
                  >
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
