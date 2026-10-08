import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchProductById, clearSelectedProduct } from "../features/products/productSlice";
import { addToCart } from "../features/cart/cartSlice";
import { toggleFavorite, selectFavoriteIds } from "../features/favorites/favoritesSlice";
import { toast } from "react-toastify";
import { flyToCart } from "../utils/flyToCart";
import { usePageTitle } from "../components/PageTitle";
import { trackViewItem } from "../utils/analytics";
import { buildProductSchema, absUrl } from "../../seo/seo.config";
import { Heart, Palette, Edit3, CheckCircle2, XCircle, Check, Minus, Plus, ShoppingCart, ShoppingBag, Printer, Package, Truck, RotateCcw, Scale, ChevronLeft, ChevronRight, Share2 } from "lucide-react";

/* Bare arrow — no pill, no circle, just the glyph with a soft halo so it stays
   legible over both light and dark artwork. Always visible, never hover-gated. */
const ARROW =
  "absolute top-1/2 -translate-y-1/2 z-10 p-2 bg-transparent border-none cursor-pointer text-slate-900/85 hover:text-brand-700 active:scale-90 transition-all duration-200 [filter:drop-shadow(0_0_3px_rgba(255,255,255,0.95))_drop-shadow(0_1px_4px_rgba(255,255,255,0.85))]";

export default function ProductDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { selectedProduct: product, loading } = useSelector((s) => s.products);
  const favoriteIds = useSelector(selectFavoriteIds);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState("desc");
  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const galleryRef = useRef(null);

  useEffect(() => { dispatch(fetchProductById(id)); return () => dispatch(clearSelectedProduct()); }, [dispatch, id]);
  useEffect(() => { setActiveIdx(0); setSelectedSize(""); }, [product?._id]);
  useEffect(() => { if (product) trackViewItem(product); }, [product]);

  /* Tab title follows the product once it loads */
  usePageTitle(
    product?.name
      ? `${product.name} — Customise & Order | Cloud Graphics Amravati`
      : "Product Details — Cloud Graphics Amravati",
    product?.description ? String(product.description).replace(/\s+/g, " ").trim().slice(0, 155) : undefined,
    {
      path: `/products/${id}`,
      schema: product ? [buildProductSchema(product, absUrl(`/products/${id}`))] : undefined,
    }
  );

  const images = product ? (product.images?.length ? product.images : product.image ? [product.image] : []) : [];

  const prev = useCallback(() => { if (images.length > 1) setActiveIdx((i) => (i - 1 + images.length) % images.length); }, [images.length]);
  const next = useCallback(() => { if (images.length > 1) setActiveIdx((i) => (i + 1) % images.length); }, [images.length]);

  /* Auto-advance, restarted on every manual move so a click is never overridden. */
  useEffect(() => {
    if (images.length <= 1) return;
    const t = setTimeout(next, 4500);
    return () => clearTimeout(t);
  }, [next, activeIdx, images.length]);

  useEffect(() => {
    if (images.length <= 1) return;
    const onKey = (e) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, images.length]);

  if (loading || !product) return (
    <div className="bg-[#f7fafc] min-h-screen flex flex-col items-center justify-center py-32">
      <div className="w-10 h-10 border-2 border-slate-200 border-t-brand-700 rounded-full animate-spin mb-4" />
      <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.22em]">Loading product</p>
    </div>
  );

  const isFav = favoriteIds.has(product._id);
  const hasDiscount = product.originalPrice > 0 && product.originalPrice > product.price;
  const discountPct = hasDiscount ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
  const hasSpecs = product.specifications?.length > 0;
  const TABS = [{ key: "desc", label: "Description" }, ...(hasSpecs ? [{ key: "specs", label: "Specifications" }] : []), { key: "delivery", label: "Delivery & Returns" }];
  const currentImage = images[activeIdx] || "https://placehold.co/800x800/f4f4f2/999?text=Product";

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied to clipboard"); }
    } catch { /* dismissed by the user — nothing to report */ }
  };

  const guardSize = () => {
    if (product.sizes?.length > 0 && !selectedSize) { toast.error("Please select a size first"); return false; }
    return true;
  };

  return (
    <div className="bg-[#f7fafc] min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-5 md:py-8 pb-20">
        {/* ── Breadcrumb ── */}
        <nav className="flex items-center flex-wrap gap-2 text-[11px] font-medium text-slate-400 mb-6 md:mb-8">
          <Link to="/" className="hover:text-brand-700 transition-colors">Home</Link>
          <span className="text-slate-300">/</span>
          <Link to="/products" className="hover:text-brand-700 transition-colors">Products</Link>
          <span className="text-slate-300">/</span>
          <Link to={`/products?category=${product.category}`} className="hover:text-brand-700 transition-colors">{product.category}</Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 truncate max-w-[220px] md:max-w-none">{product.name}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-14 xl:gap-20">
          {/* ─────────── Gallery ─────────── */}
          <div className="w-full max-w-[420px] mx-auto lg:mx-0 lg:w-[38%] lg:max-w-none xl:w-[430px] shrink-0">
            <div className="relative bg-white rounded-[20px] overflow-hidden aspect-square ring-1 ring-slate-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <img
                key={currentImage}
                ref={galleryRef}
                src={currentImage}
                alt={product.name}
                className="w-full h-full object-cover animate-fade-in-up"
              />

              {hasDiscount && (
                <div className="absolute top-4 left-4 bg-brand-700 text-white text-[10px] font-bold uppercase tracking-[0.16em] px-2.5 py-1.5 rounded-full shadow-sm">
                  {discountPct}% Off
                </div>
              )}

              {images.length > 1 && (
                <>
                  <button type="button" aria-label="Previous image" onClick={prev} className={`${ARROW} left-1.5 md:left-3`}>
                    <ChevronLeft className="w-7 h-7 md:w-8 md:h-8" strokeWidth={1.75} />
                  </button>
                  <button type="button" aria-label="Next image" onClick={next} className={`${ARROW} right-1.5 md:right-3`}>
                    <ChevronRight className="w-7 h-7 md:w-8 md:h-8" strokeWidth={1.75} />
                  </button>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex items-center gap-2.5 mt-3.5 overflow-x-auto scrollbar-hide pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveIdx(i)}
                    aria-label={`View image ${i + 1}`}
                    className={`shrink-0 w-14 h-14 md:w-[60px] md:h-[60px] rounded-xl overflow-hidden bg-white border-none p-0 cursor-pointer transition-all duration-200 ${
                      i === activeIdx
                        ? "ring-2 ring-brand-700 ring-offset-2 ring-offset-[#f7fafc]"
                        : "ring-1 ring-slate-200 opacity-60 hover:opacity-100 hover:ring-slate-300"
                    }`}
                  >
                    <img src={img} alt={`view-${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ─────────── Info ─────────── */}
          <div className="flex-1 min-w-0">
            {/* Eyebrow + title */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span className="w-6 h-px bg-brand-700" />
                  <span className="text-[9.5px] font-bold uppercase tracking-[0.28em] text-brand-700">{product.category}</span>
                </div>
                <h1 className="font-display text-[27px] md:text-[38px] font-black text-slate-900 leading-[1.08] tracking-[-0.02em] m-0">
                  {product.name}
                </h1>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 mt-1">
                <button onClick={share} aria-label="Share product"
                  className="w-10 h-10 rounded-full bg-white ring-1 ring-slate-200 text-slate-400 flex items-center justify-center cursor-pointer hover:text-slate-900 hover:ring-slate-300 transition-all">
                  <Share2 className="w-[17px] h-[17px]" />
                </button>
                <button onClick={() => { dispatch(toggleFavorite(product)); toast.dismiss(); toast.success(isFav ? "Removed from favourites" : "Added to favourites"); }}
                  aria-label={isFav ? "Remove from favourites" : "Add to favourites"}
                  className={`w-10 h-10 rounded-full bg-white ring-1 flex items-center justify-center cursor-pointer transition-all ${isFav ? "ring-brand-200 text-brand-700" : "ring-slate-200 text-slate-400 hover:text-brand-700 hover:ring-brand-200"}`}>
                  <Heart className={`w-[18px] h-[18px] ${isFav ? "fill-current" : ""}`} />
                </button>
              </div>
            </div>

            {/* Meta */}
            {(product.brand || product.sku) && (
              <div className="flex items-center gap-2.5 mt-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                {product.brand && <span className="text-slate-800">by {product.brand}</span>}
                {product.brand && product.sku && <span className="w-1 h-1 rounded-full bg-slate-300" />}
                {product.sku && <span>SKU {product.sku}</span>}
              </div>
            )}

            {/* Price */}
            <div className="flex items-end flex-wrap gap-x-4 gap-y-2 mt-5 pb-6 border-b border-slate-200/80">
              <span className="font-sans text-brand-700 text-[34px] md:text-[42px] font-extrabold leading-none tracking-normal tabular-nums">
                ₹{product.price.toLocaleString()}
              </span>
              {hasDiscount && (
                <>
                  <span className="font-sans text-slate-500 text-xl line-through font-semibold leading-none pb-1 tabular-nums">₹{product.originalPrice.toLocaleString()}</span>
                  <span className="pb-1 text-[12px] font-bold uppercase tracking-[0.1em] text-emerald-800 bg-emerald-50 ring-1 ring-emerald-100 px-2.5 py-1 rounded-full">
                    Save ₹{(product.originalPrice - product.price).toLocaleString()}
                  </span>
                </>
              )}
              <span className="basis-full text-[13px] font-semibold text-slate-500 m-0">
                {product.deliveryCharge > 0
                  ? <>+ ₹{product.deliveryCharge.toLocaleString()} delivery charge per item</>
                  : <span className="text-emerald-800">Free delivery</span>}
              </span>
            </div>

            {/* Stock */}
            <div className={`inline-flex items-center gap-2 mt-5 text-[13px] font-bold uppercase tracking-[0.1em] ${product.stock > 0 ? "text-emerald-800" : "text-brand-700"}`}>
              {product.stock > 0
                ? <><CheckCircle2 className="w-4 h-4" /> In stock · {product.stock} available</>
                : <><XCircle className="w-4 h-4" /> Out of stock</>}
            </div>

            {/* Highlights */}
            {product.highlights?.length > 0 && (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 list-none p-0 mt-5 mb-0">
                {product.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[15px] font-medium text-slate-800 leading-relaxed">
                    <Check className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Notices */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 mt-6">
              {product.requiresCustomImage && (
                <div className="flex gap-3 bg-white rounded-2xl ring-1 ring-brand-100 p-4">
                  <Palette className="w-[18px] h-[18px] text-brand-700 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold text-slate-900 m-0">Custom design required</p>
                    <p className="text-[12.5px] text-slate-500 leading-relaxed mt-0.5 mb-0">Upload your image or design during checkout.</p>
                  </div>
                </div>
              )}
              <div className={`flex gap-3 bg-white rounded-2xl ring-1 p-4 ${product.allowCOD === false ? "ring-slate-200/80" : "ring-emerald-100"}`}>
                <Truck className={`w-[18px] h-[18px] shrink-0 mt-0.5 ${product.allowCOD === false ? "text-slate-500" : "text-emerald-700"}`} />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-bold text-slate-900 m-0">
                    {product.allowCOD === false ? "Cash on Delivery not available" : "Cash on Delivery available"}
                  </p>
                  <p className="text-[12.5px] text-slate-500 leading-relaxed mt-0.5 mb-0">
                    {product.allowCOD === false ? "Please pay online for this product." : "Pay in cash when your order arrives."}
                  </p>
                </div>
              </div>
            </div>

            {/* Size */}
            {product.sizes?.length > 0 && (
              <div className="mt-7">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-900">
                    Size <span className="text-brand-700">*</span>
                  </span>
                  {selectedSize && <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">{selectedSize} selected</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button key={s} type="button" onClick={() => setSelectedSize(s)}
                      className={`min-w-[3.25rem] px-4 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer transition-all duration-200 ${
                        selectedSize === s
                          ? "bg-slate-900 text-white ring-1 ring-slate-900"
                          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-400 hover:text-slate-900"
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + actions */}
            <div className="mt-7 flex flex-col gap-4">
              {product.stock > 0 && (
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-900">Qty</span>
                  <div className="flex items-center bg-white rounded-full ring-1 ring-slate-200 overflow-hidden">
                    <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease quantity"
                      className="w-10 h-10 flex items-center justify-center bg-transparent border-none cursor-pointer text-slate-500 hover:text-brand-700 transition-colors">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center text-[15px] font-bold text-slate-900 tabular-nums">{qty}</span>
                    <button onClick={() => setQty(Math.min(product.stock, qty + 1))} aria-label="Increase quantity"
                      className="w-10 h-10 flex items-center justify-center bg-transparent border-none cursor-pointer text-slate-500 hover:text-brand-700 transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    if (!guardSize()) return;
                    dispatch(addToCart({ ...product, size: selectedSize, quantity: qty }));
                    flyToCart(galleryRef.current);
                  }}
                  disabled={product.stock === 0}
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 py-3.5 rounded-full bg-white text-slate-900 ring-1 ring-slate-300 border-none text-[13px] font-bold uppercase tracking-[0.14em] cursor-pointer transition-all duration-200 hover:ring-slate-900 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ShoppingCart className="w-4 h-4" /> Add to Cart
                </button>
                <button
                  onClick={() => {
                    if (!guardSize()) return;
                    dispatch(addToCart({ ...product, size: selectedSize, quantity: qty }));
                    navigate("/cart");
                  }}
                  disabled={product.stock === 0}
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 py-3.5 rounded-full bg-brand-700 text-white border-none text-[13px] font-bold uppercase tracking-[0.14em] cursor-pointer transition-all duration-200 hover:bg-brand-800 hover:shadow-[0_12px_28px_-12px_rgba(10, 91, 130,0.7)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none">
                  <ShoppingBag className="w-4 h-4" /> Buy Now
                </button>
              </div>
            </div>

            {/* Trust strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-200/70 rounded-2xl overflow-hidden ring-1 ring-slate-200/70 mt-8">
              {[
                { icon: Printer, text: "Premium printing" },
                { icon: Package, text: "Secure packaging" },
                { icon: Truck, text: "Fast delivery" },
                { icon: RotateCcw, text: "Easy returns" },
              ].map((b, i) => (
                <div key={i} className="flex flex-col items-center justify-center text-center gap-2 bg-white py-5 px-2">
                  <b.icon className="w-6 h-6 text-brand-700" strokeWidth={2} />
                  <span className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-slate-800">{b.text}</span>
                </div>
              ))}
            </div>

            {product.weight && (
              <div className="mt-3 flex items-center justify-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                <Scale className="w-3.5 h-3.5" /> Weight · <span className="text-slate-600">{product.weight}</span>
              </div>
            )}
          </div>
        </div>

        {/* ─────────── Tabs ─────────── */}
        <div className="mt-12 md:mt-16 bg-white rounded-[24px] ring-1 ring-slate-200/70 p-5 md:p-10">
          <div className="flex gap-6 md:gap-8 border-b border-slate-200/80 mb-7 overflow-x-auto scrollbar-hide">
            {TABS.map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`relative shrink-0 pb-3.5 bg-transparent border-none cursor-pointer text-[13px] font-bold uppercase tracking-[0.12em] transition-colors ${
                  tab === key ? "text-brand-700" : "text-slate-600 hover:text-slate-900"
                }`}>
                {label}
                {tab === key && <span className="absolute -bottom-px inset-x-0 h-0.5 bg-brand-700 rounded-full" />}
              </button>
            ))}
          </div>

          {tab === "desc" && (
            <p className="max-w-3xl text-[15.5px] text-slate-800 leading-[1.85] whitespace-pre-line m-0">{product.description}</p>
          )}

          {tab === "specs" && (
            <div className="max-w-3xl divide-y divide-slate-100">
              {product.specifications.map((sp, i) => (
                <div key={i} className="flex flex-col sm:flex-row gap-1 sm:gap-6 py-3.5">
                  <span className="sm:w-52 shrink-0 text-[12px] font-bold uppercase tracking-[0.12em] text-slate-600 pt-0.5">{sp.key}</span>
                  <span className="text-[15px] text-slate-900 leading-relaxed">{sp.value}</span>
                </div>
              ))}
            </div>
          )}

          {tab === "delivery" && (
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              {[
                { icon: Truck, title: "Delivery details", body: "3–5 business days in Amravati. 5–7 days for other Maharashtra locations. Express shipping options available at checkout." },
                { icon: RotateCcw, title: "Return policy", body: product.returnPolicy || "Custom printed products are non-returnable unless defective. Standard products can be returned within 7 days in original packaging." },
              ].map((c, i) => (
                <div key={i} className="bg-[#f7fafc] rounded-2xl p-5 md:p-6 ring-1 ring-slate-200/60">
                  <div className="flex items-center gap-2.5 mb-3">
                    <c.icon className="w-6 h-6 text-brand-700" strokeWidth={2} />
                    <h3 className="text-[13px] font-bold uppercase tracking-[0.12em] text-slate-900 m-0">{c.title}</h3>
                  </div>
                  <p className="text-[15px] text-slate-800 leading-relaxed m-0">{c.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
