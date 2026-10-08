import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProducts } from "../features/products/productSlice";
import { fetchActiveEvents } from "../features/events/eventSlice";
import { resolveLink } from "../utils/links";
import { fetchCategories } from "../features/categories/categorySlice";
import { fetchApprovedReviews, submitReview } from "../features/review/reviewSlice";
import ProductCard from "../components/ProductCard";
import HeroSlider from "../components/HeroSlider";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Truck, Palette, Star, IndianRupee, ChevronLeft, ChevronRight, ChevronDown, ShoppingBag, Upload, Printer, PackageCheck } from "lucide-react";

const REVIEW_EMPTY = { name: "", email: "", rating: 0, message: "" };
const FEATURES = [
  { icon: <Truck size={28} className="text-brand-700" />, title: "Fast Delivery", desc: "Quick delivery across Amravati & Maharashtra" },
  { icon: <Palette size={28} className="text-brand-700" />, title: "100% Custom Designs", desc: "Upload your photo or design — we print it" },
  { icon: <Star size={28} className="text-brand-700" />, title: "Premium Quality", desc: "Durable prints that last for years" },
  { icon: <IndianRupee size={28} className="text-brand-700" />, title: "Best Prices", desc: "Affordable prices with bulk discounts" },
];

const STEPS = [
  {
    step: "1",
    icon: <ShoppingBag size={22} />,
    title: "Choose Product",
    desc: "Browse mugs, frames, t-shirts and more — pick what you want to personalize.",
  },
  {
    step: "2",
    icon: <Upload size={22} />,
    title: "Upload Design",
    desc: "Add your photo, logo or artwork. We check the quality before printing.",
  },
  {
    step: "3",
    icon: <Printer size={22} />,
    title: "We Print It",
    desc: "Premium printing on durable materials, finished and quality-checked by hand.",
  },
  {
    step: "4",
    icon: <PackageCheck size={22} />,
    title: "Fast Delivery",
    desc: "Safely packed and delivered to your doorstep across Amravati & Maharashtra.",
  },
];

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1 mt-1">
      {[1,2,3,4,5].map((star) => (
        <button key={star} type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className={`bg-transparent border-none cursor-pointer p-0.5 text-3xl leading-none transition-transform duration-100 ${star <= (hovered || value) ? "text-amber-400 scale-110" : "text-gray-300"}`}>
          ★
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ rating }) {
  return (
    <span className="inline-flex gap-px">
      {[1,2,3,4,5].map((star) => (
        <span key={star} className={`text-base ${star <= rating ? "text-amber-400" : "text-gray-300"}`}>★</span>
      ))}
    </span>
  );
}

export default function Home() {
  const dispatch = useDispatch();
  const { items: products, loading } = useSelector((s) => s.products);
  const { events } = useSelector((s) => s.events);
  const { items: categories } = useSelector((s) => s.categories);
  const { approvedReviews, loading: reviewLoading } = useSelector((s) => s.review);

  const [reviewForm, setReviewForm] = useState(REVIEW_EMPTY);
  const [reviewErrors, setReviewErrors] = useState({});
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const reviewTrackRef = useRef(null);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [reviewPages, setReviewPages] = useState(1);

  const reviewStep = () => {
    const el = reviewTrackRef.current;
    const card = el?.firstElementChild;
    if (!el || !card) return 0;
    return card.offsetWidth + 20; // card + gap-5
  };

  const syncReviewRail = () => {
    const el = reviewTrackRef.current;
    const step = reviewStep();
    if (!el || !step) return;
    setReviewPages(Math.max(1, Math.round((el.scrollWidth - el.clientWidth) / step) + 1));
    setReviewIdx(Math.round(el.scrollLeft / step));
  };

  const handleReviewScroll = () => {
    const el = reviewTrackRef.current;
    const step = reviewStep();
    if (!el || !step) return;
    setReviewIdx(Math.round(el.scrollLeft / step));
  };

  const scrollReviews = (dir) => {
    const el = reviewTrackRef.current;
    const step = reviewStep();
    if (!el || !step) return;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const catRailRef = useRef(null);
  const [catArrows, setCatArrows] = useState({ left: false, right: false });
  const [catOverflow, setCatOverflow] = useState(false);
  const [showAllCats, setShowAllCats] = useState(false);

  const syncCatArrows = () => {
    const el = catRailRef.current;
    if (!el) return;
    const overflowing = el.scrollWidth > el.clientWidth + 8;
    setCatOverflow(overflowing);
    setCatArrows({
      left: overflowing && el.scrollLeft > 8,
      right: overflowing && el.scrollLeft + el.clientWidth < el.scrollWidth - 8,
    });
  };

  const scrollCatRail = (dir) => {
    const el = catRailRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: "smooth" });
  };

  useEffect(() => {
    dispatch(fetchProducts()); dispatch(fetchActiveEvents());
    dispatch(fetchCategories()); dispatch(fetchApprovedReviews());
  }, [dispatch]);

  useEffect(() => {
    syncCatArrows();
    window.addEventListener("resize", syncCatArrows);
    return () => window.removeEventListener("resize", syncCatArrows);
  }, [categories, catOverflow]);

  useEffect(() => {
    syncReviewRail();
    window.addEventListener("resize", syncReviewRail);
    return () => window.removeEventListener("resize", syncReviewRail);
  }, [approvedReviews]);

  const visibleReviews = approvedReviews.slice(0, 9);
  const featured = products.slice(0, 8);
  const customize = products.filter((p) => p.requiresCustomImage).slice(0, 4);

  const validateReview = () => {
    const e = {};
    if (!reviewForm.name.trim()) e.name = "Name is required";
    if (!reviewForm.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reviewForm.email)) e.email = "Enter a valid email";
    if (!reviewForm.rating) e.rating = "Please select a rating";
    if (!reviewForm.message.trim()) e.message = "Review message is required";
    else if (reviewForm.message.trim().length < 10) e.message = "At least 10 characters required";
    return e;
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    const errs = validateReview();
    if (Object.keys(errs).length) { setReviewErrors(errs); return; }
    const result = await dispatch(submitReview(reviewForm));
    if (!result.error) {
      setReviewSubmitted(true); setReviewForm(REVIEW_EMPTY); setReviewErrors({}); setShowReviewForm(false);
      toast.success("Review submitted! It will appear after approval.");
    } else { toast.error(result.payload || "Failed to submit. Please try again."); }
  };

  const inputCls = (err) => `w-full border rounded-lg px-3.5 py-2.5 text-sm outline-none font-[inherit] transition-colors ${err ? "border-red-500 bg-red-50" : "border-gray-200 bg-white focus:border-brand-600"}`;

  return (
    <div className="bg-white">
      <HeroSlider />

      {/* Events ticker (compact) */}
      {events.length > 0 && (
        <div className="bg-brand-50 border-b border-pink-100">
          <div className="max-w-7xl mx-auto flex overflow-x-auto">
            {events.slice(0, 3).map((ev) => {
              const link = resolveLink(ev.link);
              return (
                <div key={ev._id} className="flex items-center gap-2 px-6 py-2.5 border-r border-pink-100 whitespace-nowrap">
                  <span className="bg-brand-700 text-white text-[10px] font-bold px-2 py-0.5 rounded">{ev.badge}</span>
                  <span className="text-gray-800 text-xs font-medium">{ev.title}</span>
                  {link && (link.external
                    ? <a href={link.to} target="_blank" rel="noopener noreferrer" className="text-brand-700 text-xs font-semibold">View →</a>
                    : <Link to={link.to} className="text-brand-700 text-xs font-semibold">View →</Link>)}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category rail */}
      {categories.length > 0 && (
        <section className="max-w-[1800px] mx-auto px-4 md:px-8 lg:px-10 py-10 md:py-14">
          <div className="flex items-center justify-between gap-4 mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
              Shop by Category
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              <Link to="/products" className="text-gray-500 hover:text-brand-700 font-medium text-sm mr-1 transition-colors">
                View all
              </Link>
              <button
                type="button"
                aria-label="Previous categories"
                onClick={() => scrollCatRail(-1)}
                disabled={!catArrows.left}
                className="w-9 h-9 rounded-full bg-gray-900 text-white hidden md:flex items-center justify-center transition-all duration-300 hover:bg-brand-700 disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                aria-label="Next categories"
                onClick={() => scrollCatRail(1)}
                disabled={!catArrows.right}
                className="w-9 h-9 rounded-full bg-gray-900 text-white hidden md:flex items-center justify-center transition-all duration-300 hover:bg-brand-700 disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div
            ref={catRailRef}
            onScroll={syncCatArrows}
            className={`grid grid-cols-3 gap-x-3 gap-y-5 md:flex md:gap-y-0 md:overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1 ${
              catOverflow
                ? "md:gap-5 lg:gap-8 md:justify-start md:snap-x md:snap-mandatory"
                : "md:gap-6 md:justify-between"
            }`}
          >
            {categories.map((cat, idx) => (
              <Link
                key={cat._id}
                to={`/products?category=${cat.name}`}
                className={`group md:snap-start no-underline w-full min-w-0 ${
                  !showAllCats && idx >= 6 ? "hidden md:block" : ""
                } ${
                  catOverflow
                    ? "md:shrink-0 md:w-[124px]"
                    : "md:flex-1 md:min-w-[92px] md:max-w-[170px]"
                }`}
              >
                <div className="aspect-square flex items-center justify-center overflow-hidden">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      loading="lazy"
                      className="max-w-full max-h-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.07]"
                    />
                  ) : (
                    <span className="text-4xl opacity-30">{cat.icon || "🏷️"}</span>
                  )}
                </div>
                <p className="mt-3 text-center text-[13px] md:text-sm font-medium text-gray-800 group-hover:text-brand-700 transition-colors duration-300 truncate">
                  {cat.name}
                </p>
              </Link>
            ))}
          </div>

          {categories.length > 6 && (
            <div className="mt-6 flex justify-center md:hidden">
              <button
                type="button"
                onClick={() => setShowAllCats((v) => !v)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-gray-300 text-sm font-semibold text-gray-800 bg-white hover:border-brand-700 hover:text-brand-700 transition-colors duration-300 cursor-pointer"
              >
                {showAllCats ? "Show Less" : "View More Categories"}
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-300 ${showAllCats ? "rotate-180" : ""}`}
                />
              </button>
            </div>
          )}
        </section>
      )}

      {/* Featured Products */}
      <section className="bg-[#f7f6f3] px-4 md:px-12 py-12 md:py-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="font-display text-3xl md:text-[40px] font-bold text-gray-900 tracking-tight leading-none">Featured Products</h2>
              <span className="block w-12 h-[3px] bg-brand-700 rounded-full mt-3" />
            </div>
            <Link to="/products" className="text-brand-700 font-semibold text-sm whitespace-nowrap pt-2">View All →</Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-5">
              {[...Array(4)].map((_, i) => <div key={i} className="aspect-[4/6.2] bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : featured.length === 0 ? (
            <p className="text-gray-400 text-center py-10">No products yet. Check back soon!</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-5">
              {featured.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* Design Your Own */}
      {customize.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-12 py-10 md:py-12">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="font-display text-3xl md:text-[40px] font-bold text-gray-900 tracking-tight leading-none">Design Your Own</h2>
              <span className="block w-12 h-[3px] bg-brand-700 rounded-full mt-3" />
            </div>
            <Link to="/products?type=customize" className="text-brand-700 font-semibold text-sm whitespace-nowrap pt-2">View All →</Link>
          </div>
          <p className="text-gray-500 text-sm mb-7 mt-4">Upload your photo and get it printed on premium products</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-5">
            {customize.map((p) => <ProductCard key={p._id} product={p} badge="Customize" />)}
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="py-14 lg:py-16" style={{ background: "#f7fafc" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">

          {/* Header */}
          <div className="text-center max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-8 h-[1px]" style={{ background: "#9cc9de" }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.3em]"
                style={{ color: "#05618e" }}
              >
                How It Works
              </span>
              <div className="w-8 h-[1px]" style={{ background: "#9cc9de" }} />
            </div>

            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: "clamp(1.75rem,3.3vw,3rem)",
                lineHeight: 1.18,
                letterSpacing: "-0.02em",
                color: "#1a1a1a",
              }}
            >
              Your Design, Delivered
              <span style={{ color: "#05618e" }}> In 4 Simple Steps</span>
            </h2>

            <p className="mt-4 text-[15px] leading-[1.85] text-gray-500">
              From picking a product to doorstep delivery — the whole
              customization process, made smooth and hassle-free.
            </p>
          </div>

          {/* Steps */}
          <div className="relative mt-10 lg:mt-14">

            {/* Connector line (desktop) */}
            <div
              className="hidden lg:block absolute left-[12.5%] right-[12.5%] top-7 h-[1px]"
              style={{ background: "linear-gradient(90deg,#daeffa,#b0def4,#daeffa)" }}
            />

            <ol className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
              {STEPS.map((item, i) => (
                <li key={item.step} className="relative flex gap-5 lg:block text-left lg:text-center">

                  {/* Connector line (mobile / tablet) */}
                  {i !== STEPS.length - 1 && (
                    <span
                      className="sm:hidden absolute left-7 top-14 bottom-[-2rem] w-[1px]"
                      style={{ background: "#dbe8f0" }}
                      aria-hidden="true"
                    />
                  )}

                  {/* Icon badge */}
                  <div className="relative shrink-0 lg:mx-auto lg:w-14">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white"
                      style={{
                        background: "linear-gradient(135deg,#05618e 0%,#2fa3db 100%)",
                        boxShadow: "0 10px 24px rgba(5, 97, 142,0.22)",
                      }}
                    >
                      {item.icon}
                    </div>
                    <span
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                      style={{
                        background: "#fff",
                        color: "#05618e",
                        border: "1px solid #dce9f1",
                      }}
                    >
                      {item.step}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="pb-2 lg:pb-0 lg:mt-5">
                    <h3 className="text-[17px] font-bold" style={{ color: "#181818" }}>
                      {item.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-[1.8] text-gray-500 lg:max-w-[15rem] lg:mx-auto">
                      {item.desc}
                    </p>
                  </div>

                </li>
              ))}
            </ol>
          </div>

          {/* CTA */}
          <div className="mt-12 flex flex-col items-center gap-4">
            <Link
              to="/products?type=customize"
              className="group inline-flex items-center gap-3 pl-6 pr-2 py-2 rounded-full text-[14px] font-semibold transition-all duration-300 hover:-translate-y-[2px]"
              style={{
                background: "#05618e",
                color: "#fff",
                boxShadow: "0 12px 30px rgba(5, 97, 142,0.20)",
              }}
            >
              Start customizing
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center text-base transition-transform duration-300 group-hover:translate-x-[2px]"
                style={{ background: "rgba(255,255,255,0.16)" }}
              >
                →
              </span>
            </Link>

            <p className="text-[13px] text-gray-500">
              Premium Printing • Fast Delivery • Trusted Quality
            </p>
          </div>

        </div>
      </section>

      {/* Customer Reviews */}
      <section
        className="relative overflow-hidden py-14 lg:py-16"
        style={{ background: "#f3f7fa" }}
      >

        {/* Ambient Glow */}
        <div
          className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{ background: "#d8e7f1" }}
        />
        <div
          className="absolute -bottom-32 -left-28 w-[360px] h-[360px] rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ background: "#dde8ef" }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">

            {/* ───────────────── Left · Editorial ───────────────── */}
            <div className="lg:col-span-5">

              {/* Label */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-[1px]" style={{ background: "#9cc9de" }} />
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.3em]"
                  style={{ color: "#05618e" }}
                >
                  Customer Reviews
                </span>
              </div>

              {/* Heading */}
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                  fontSize: "clamp(2rem,3.3vw,3rem)",
                  lineHeight: 1.18,
                  letterSpacing: "-0.02em",
                  color: "#1a1a1a",
                }}
              >
                Loved By Customers
                <br />
                <span style={{ color: "#05618e" }}>
                  Across Amravati
                </span>
              </h2>

              {/* Description */}
              <p className="mt-5 text-[15px] leading-[1.85] text-gray-500 max-w-md">
                From custom photo gifts to premium printing, Cloud Graphics has
                become a trusted choice for quality, creativity and memorable
                gifting experiences.
              </p>

              {/* Stats */}
              <div className="mt-8 flex items-center gap-7">

                <div>
                  <div className="flex items-baseline gap-2">
                    <span
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontWeight: 600,
                        fontSize: "2.3rem",
                        lineHeight: 1,
                        color: "#181818",
                      }}
                    >
                      4.9
                    </span>
                    <StarDisplay rating={5} />
                  </div>
                  <p className="mt-2 text-[13px] text-gray-500">
                    Average rating
                  </p>
                </div>

                <div className="w-[1px] h-12" style={{ background: "#d4e2ea" }} />

                <div>
                  <span
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontWeight: 600,
                      fontSize: "2.3rem",
                      lineHeight: 1,
                      color: "#181818",
                    }}
                  >
                    500+
                  </span>
                  <p className="mt-2 text-[13px] text-gray-500">
                    Happy customers
                  </p>
                </div>

              </div>

              {/* CTA */}
              <button
                onClick={() => {
                  setShowReviewForm((v) => !v);
                  setReviewSubmitted(false);
                }}
                className="group mt-9 inline-flex items-center gap-3 pl-6 pr-2 py-2 rounded-full text-[14px] font-semibold transition-all duration-300 hover:-translate-y-[2px]"
                style={{
                  background: "#05618e",
                  color: "#fff",
                  boxShadow: "0 12px 30px rgba(5, 97, 142,0.20)",
                }}
              >
                {showReviewForm ? "Close review form" : "Write a review"}
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center text-base transition-transform duration-300 group-hover:rotate-90"
                  style={{ background: "rgba(255,255,255,0.16)" }}
                >
                  {showReviewForm ? "×" : "→"}
                </span>
              </button>

            </div>

            {/* ───────────────── Right · Reviews ───────────────── */}
            <div className="lg:col-span-7 min-w-0">

              {reviewLoading && approvedReviews.length === 0 ? (

                /* Loading */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {[...Array(2)].map((_, i) => (
                    <div
                      key={i}
                      className="h-[250px] rounded-[22px] animate-pulse"
                      style={{
                        background: "#fbfdff",
                        border: "1px solid #e1eaf0",
                      }}
                    />
                  ))}
                </div>

              ) : approvedReviews.length === 0 ? (

                /* Empty */
                <div
                  className="rounded-[22px] px-8 py-14 text-center"
                  style={{
                    background: "#fbfdff",
                    border: "1px dashed #d6e4ec",
                  }}
                >
                  <div
                    className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl"
                    style={{ background: "#f2f9fd" }}
                  >
                    ⭐
                  </div>
                  <h3
                    className="text-2xl"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontWeight: 700,
                      color: "#181818",
                    }}
                  >
                    No Reviews Yet
                  </h3>
                  <p className="text-gray-500 mt-2 text-[14px]">
                    Be the first customer to share your experience.
                  </p>
                </div>

              ) : (

                <>
                  {/* Slider */}
                  <div
                    ref={reviewTrackRef}
                    onScroll={handleReviewScroll}
                    className="flex gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mx-1 px-1"
                    style={{ scrollBehavior: "smooth" }}
                  >
                    {visibleReviews.map((review) => (

                      <article
                        key={review._id}
                        className="group relative snap-start shrink-0 w-full sm:w-[calc(50%-10px)] rounded-[22px] p-6 flex flex-col transition-all duration-300 hover:-translate-y-1"
                        style={{
                          background: "#fbfdff",
                          border: "1px solid #e1eaf0",
                          boxShadow: "0 8px 26px rgba(0,0,0,0.035)",
                        }}
                      >

                        {/* Quote Glyph */}
                        <span
                          className="absolute top-3 right-6 text-[64px] leading-none pointer-events-none select-none"
                          style={{
                            color: "#e2eef5",
                            fontFamily: "'Playfair Display', serif",
                          }}
                        >
                          ”
                        </span>

                        {/* Rating */}
                        <div className="relative flex items-center gap-2 mb-4">
                          <StarDisplay rating={review.rating} />
                          <span className="text-[12px] text-gray-400">
                            {review.rating}.0
                          </span>
                        </div>

                        {/* Message */}
                        <p className="relative text-[14.5px] leading-[1.8] text-gray-600 line-clamp-5 min-h-[130px]">
                          {review.message}
                        </p>

                        {/* Author */}
                        <div
                          className="mt-5 pt-4 flex items-center gap-3"
                          style={{ borderTop: "1px solid #e6eff5" }}
                        >
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-[15px] shrink-0"
                            style={{
                              background:
                                "linear-gradient(135deg,#05618e 0%, #0f7fb8 100%)",
                            }}
                          >
                            {review.name[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-[15px] font-semibold text-gray-900 truncate">
                              {review.name}
                            </h4>
                            <p className="text-[12px] text-gray-400">
                              Verified customer
                            </p>
                          </div>
                        </div>

                      </article>

                    ))}
                  </div>

                  {/* Controls */}
                  <div className="mt-6 flex items-center justify-between">

                    {/* Progress */}
                    <div className="flex items-center gap-2">
                      {[...Array(reviewPages)].map((_, i) => (
                        <span
                          key={i}
                          className="h-[3px] rounded-full transition-all duration-300"
                          style={{
                            width: i === reviewIdx ? 26 : 10,
                            background: i === reviewIdx ? "#05618e" : "#d1e0e9",
                          }}
                        />
                      ))}
                    </div>

                    {/* Arrows */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Previous review"
                        onClick={() => scrollReviews(-1)}
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300"
                        style={{
                          background: "#fbfdff",
                          border: "1px solid #d6e4ec",
                          color: "#05618e",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#05618e";
                          e.currentTarget.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#fbfdff";
                          e.currentTarget.style.color = "#05618e";
                        }}
                      >
                        <ChevronLeft size={18} />
                      </button>

                      <button
                        type="button"
                        aria-label="Next review"
                        onClick={() => scrollReviews(1)}
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300"
                        style={{
                          background: "#fbfdff",
                          border: "1px solid #d6e4ec",
                          color: "#05618e",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#05618e";
                          e.currentTarget.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#fbfdff";
                          e.currentTarget.style.color = "#05618e";
                        }}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>

                  </div>
                </>

              )}

            </div>

          </div>

          {/* ───────────────── Review Form ───────────────── */}
          {showReviewForm && (

            <div className="mt-14 flex justify-center">

              <div
                className="relative overflow-hidden w-full max-w-4xl rounded-[28px]"
                style={{
                  background: "linear-gradient(180deg,#fbfdff 0%, #f7fbfe 100%)",
                  border: "1px solid #dfebf2",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.06)",
                }}
              >

                {/* Top Decorative */}
                <div
                  className="h-[6px] w-full"
                  style={{
                    background:
                      "linear-gradient(90deg,#05618e 0%, #2fa3db 50%, #05618e 100%)",
                  }}
                />

                {/* Background Glow */}
                <div
                  className="absolute top-0 right-0 w-60 h-60 rounded-full blur-3xl opacity-40 pointer-events-none"
                  style={{ background: "#d6e9f4" }}
                />

                <div className="relative p-7 md:p-10">

                  {/* Header */}
                  <div className="text-center mb-9">

                    <span
                      className="inline-block text-[11px] font-semibold uppercase tracking-[0.3em] mb-3"
                      style={{ color: "#05618e" }}
                    >
                      Share Feedback
                    </span>

                    <h3
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontWeight: 700,
                        fontSize: "clamp(1.75rem,3vw,2.4rem)",
                        letterSpacing: "-0.02em",
                        color: "#181818",
                      }}
                    >
                      Share Your Experience
                    </h3>

                    <p className="text-gray-500 text-[14.5px] leading-[1.85] mt-3 max-w-xl mx-auto">
                      Your review helps other customers trust our quality and
                      service.
                    </p>

                  </div>

                  {reviewSubmitted ? (

                    <div
                      className="rounded-2xl px-6 py-5 text-center"
                      style={{
                        background: "#f4faf4",
                        border: "1px solid #d9ead7",
                      }}
                    >

                      <div className="text-4xl mb-3">✅</div>

                      <h4 className="text-lg font-semibold text-green-700">
                        Review Submitted Successfully
                      </h4>

                      <p className="text-sm text-green-600 mt-2">
                        Thank you for sharing your valuable feedback.
                      </p>

                    </div>

                  ) : (

                    <form
                      onSubmit={handleReviewSubmit}
                      noValidate
                      className="flex flex-col gap-6"
                    >

                      {/* Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Name */}
                        <div>

                          <label
                            className="block text-[13px] font-semibold mb-2.5"
                            style={{ color: "#3f3f3f" }}
                          >
                            Full Name
                          </label>

                          <input
                            placeholder="Enter your full name"
                            value={reviewForm.name}
                            onChange={(e) => {
                              setReviewForm({
                                ...reviewForm,
                                name: e.target.value,
                              });

                              setReviewErrors({
                                ...reviewErrors,
                                name: "",
                              });
                            }}
                            className="w-full h-14 px-5 rounded-2xl border text-[15px] transition-all duration-300 outline-none"
                            style={{
                              borderColor: "#dce7ee",
                              background: "#ffffff",
                            }}
                          />

                          {reviewErrors.name && (
                            <span className="text-xs text-brand-600 mt-2 block">
                              {reviewErrors.name}
                            </span>
                          )}

                        </div>

                        {/* Email */}
                        <div>

                          <label
                            className="block text-[13px] font-semibold mb-2.5"
                            style={{ color: "#3f3f3f" }}
                          >
                            Email Address
                          </label>

                          <input
                            type="email"
                            placeholder="you@example.com"
                            value={reviewForm.email}
                            onChange={(e) => {
                              setReviewForm({
                                ...reviewForm,
                                email: e.target.value,
                              });

                              setReviewErrors({
                                ...reviewErrors,
                                email: "",
                              });
                            }}
                            className="w-full h-14 px-5 rounded-2xl border text-[15px] transition-all duration-300 outline-none"
                            style={{
                              borderColor: "#dce7ee",
                              background: "#ffffff",
                            }}
                          />

                          {reviewErrors.email && (
                            <span className="text-xs text-brand-600 mt-2 block">
                              {reviewErrors.email}
                            </span>
                          )}

                        </div>

                      </div>

                      {/* Rating */}
                      <div>

                        <label
                          className="block text-[13px] font-semibold mb-2.5"
                          style={{ color: "#3f3f3f" }}
                        >
                          Your Rating
                        </label>

                        <div
                          className="rounded-2xl px-5 py-3.5 border"
                          style={{
                            borderColor: "#dce7ee",
                            background: "#fff",
                          }}
                        >
                          <StarPicker
                            value={reviewForm.rating}
                            onChange={(v) => {
                              setReviewForm({
                                ...reviewForm,
                                rating: v,
                              });

                              setReviewErrors({
                                ...reviewErrors,
                                rating: "",
                              });
                            }}
                          />
                        </div>

                        {reviewErrors.rating && (
                          <span className="text-xs text-brand-600 mt-2 block">
                            {reviewErrors.rating}
                          </span>
                        )}

                      </div>

                      {/* Review */}
                      <div>

                        <label
                          className="block text-[13px] font-semibold mb-2.5"
                          style={{ color: "#3f3f3f" }}
                        >
                          Your Review
                        </label>

                        <textarea
                          rows={5}
                          placeholder="Tell us about your experience with Cloud Graphics..."
                          value={reviewForm.message}
                          onChange={(e) => {
                            setReviewForm({
                              ...reviewForm,
                              message: e.target.value,
                            });

                            setReviewErrors({
                              ...reviewErrors,
                              message: "",
                            });
                          }}
                          className="w-full rounded-2xl border p-5 text-[15px] leading-[1.85] resize-none transition-all duration-300 outline-none"
                          style={{
                            borderColor: "#dce7ee",
                            background: "#ffffff",
                          }}
                        />

                        {reviewErrors.message && (
                          <span className="text-xs text-brand-600 mt-2 block">
                            {reviewErrors.message}
                          </span>
                        )}

                      </div>

                      {/* Submit */}
                      <div className="flex justify-center pt-1">

                        <button
                          type="submit"
                          disabled={reviewLoading}
                          className="group relative overflow-hidden px-10 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 hover:-translate-y-1"
                          style={{
                            background: reviewLoading
                              ? "#c6d8e2"
                              : "linear-gradient(135deg,#05618e 0%, #2fa3db 100%)",
                            color: "#fff",
                            boxShadow: "0 15px 35px rgba(5, 97, 142,0.22)",
                          }}
                        >

                          <span className="relative z-10">
                            {reviewLoading ? "Submitting..." : "Submit Review"}
                          </span>

                          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300" />

                        </button>

                      </div>

                    </form>

                  )}

                </div>

              </div>

            </div>

          )}

        </div>

      </section>

      {/* CTA Section */}
      <section className="w-full relative overflow-hidden" style={{ background: "#072535" }}>

        {/* Background collage */}
        <div className="absolute inset-0 grid grid-cols-3 opacity-75">
          <div className="bg-cover bg-center" style={{ backgroundImage: "url('/hero_mug.png')" }} />
          <div className="bg-cover bg-center" style={{ backgroundImage: "url('/hero_shirt.png')" }} />
          <div className="bg-cover bg-center" style={{ backgroundImage: "url('/hero_diary.png')" }} />
        </div>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.38)" }} />

        <div className="relative max-w-4xl mx-auto py-16 px-4 sm:py-20 text-center" style={{ zIndex: 2 }}>
          <div className="inline-flex items-end justify-center w-full mb-8">
            {[
              "https://randomuser.me/api/portraits/men/47.jpg",
              "https://randomuser.me/api/portraits/women/46.jpg",
              "https://randomuser.me/api/portraits/women/43.jpg",
              "https://randomuser.me/api/portraits/men/48.jpg",
              "https://randomuser.me/api/portraits/men/49.jpg",
            ].map((src, i) => {
              const offsets = ["-translate-x-8", "-translate-x-4", "", "translate-x-4", "translate-x-8"];
              const sizes = ["w-10 h-10", "w-12 h-12", "w-14 h-14", "w-12 h-12", "w-10 h-10"];
              return (
                <img key={i} src={src} alt="customer"
                  className={`absolute rounded-full border-4 border-white object-cover ${sizes[i]} transform ${offsets[i]}`}
                />
              );
            })}
          </div>
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "#05618e", fontFamily: "'Montserrat', sans-serif" }}>
            500+ Happy Customers in Amravati
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight mb-4" style={{ fontFamily: "'Playfair Display', serif", textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}>
            Print Your Memories,<br />
            <span style={{ color: "#05618e" }}>Gift Something Special</span>
          </h2>
          <p className="text-white text-base max-w-xl mx-auto mb-8" style={{ opacity: 0.85, fontFamily: "'Montserrat', sans-serif" }}>
            Custom mugs, t-shirts, diaries & more — personalized with your photos and designs. Order today, delivered fast.
          </p>
          <div className="flex flex-row gap-2.5 sm:gap-3 items-center justify-center">
            <Link to="/products"
              className="flex-1 sm:flex-none text-center whitespace-nowrap px-5 sm:px-8 py-3.5 rounded-full font-bold text-sm transition-all duration-200 no-underline"
              style={{ background: "#fff", color: "#05618e", fontFamily: "'Montserrat', sans-serif", boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }}
              onMouseOver={e => e.currentTarget.style.background = "#eff8fd"}
              onMouseOut={e => e.currentTarget.style.background = "#fff"}
            >
              Shop Now →
            </Link>
            <Link to="/contact"
              className="flex-1 sm:flex-none text-center whitespace-nowrap px-5 sm:px-8 py-3.5 rounded-full font-bold text-sm transition-all duration-200 no-underline"
              style={{ border: "2px solid rgba(255,255,255,0.7)", color: "#fff", fontFamily: "'Montserrat', sans-serif", background: "transparent" }}
              onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
              onMouseOut={e => e.currentTarget.style.background = "transparent"}
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Features Strip */}
      <div className="bg-brand-50 grid grid-cols-2 md:grid-cols-4 border-t border-brand-100">
        {FEATURES.map((f, i) => (
          <div key={f.title} className={`flex items-start gap-3 px-6 py-6 ${i < 3 ? "md:border-r border-brand-200" : ""}`}>
            <div className="shrink-0 mt-1">{f.icon}</div>
            <div>
              <p className="text-gray-900 font-bold text-sm mb-1">{f.title}</p>
              <p className="text-gray-600 text-xs leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
