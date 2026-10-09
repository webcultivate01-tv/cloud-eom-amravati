import { confirmDialog } from "../components/ConfirmDialog";
import { useDispatch, useSelector } from "react-redux";
import { clearFavorites } from "../features/favorites/favoritesSlice";
import ProductCard from "../components/ProductCard";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Trash2, HeartOff, ShoppingBag } from "lucide-react";

export default function Favorites() {
  const dispatch = useDispatch();
  const { items } = useSelector((s) => s.favorites);

  const handleClearAll = async () => {
    if (!(await confirmDialog("Remove all favourites?"))) return;
    dispatch(clearFavorites());
    toast.dismiss(); toast.success("Favourites cleared");
  };

  return (
    <div className={`bg-[#f7fafc] ${items.length > 0 ? "min-h-[80vh]" : ""}`}>
      {/* ── Editorial header ── */}
      {items.length > 0 && (
        <header className="relative overflow-hidden bg-white border-b border-slate-200/70">
          <div className="pointer-events-none absolute -top-28 -right-20 w-72 h-72 rounded-full bg-brand-600/[0.06] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 w-64 h-64 rounded-full bg-amber-400/[0.05] blur-3xl" />

          <div className="relative max-w-[1400px] mx-auto px-4 md:px-8 pt-6 pb-7 md:pt-8 md:pb-9 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-6 h-px bg-brand-700" />
                <span className="text-[9.5px] font-bold uppercase tracking-[0.28em] text-brand-700">{items.length}</span>
              </div>
              <h1 className="font-display text-[26px] md:text-[34px] font-black text-slate-900 leading-[1.08] tracking-[-0.02em] m-0">
                My Favourites
              </h1>
              <p className="text-slate-500 text-[12.5px] md:text-[13.5px] mt-2 leading-relaxed">
                Products you have saved for later
              </p>
            </div>

            <button onClick={handleClearAll}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-slate-900 ring-1 ring-slate-300 border-none text-[11.5px] font-bold uppercase tracking-[0.14em] cursor-pointer transition-all duration-200 hover:text-brand-700 hover:ring-brand-200 hover:bg-brand-50">
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>
        </header>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center text-center px-6 py-16 min-h-[50vh] justify-center">
          <span className="w-20 h-20 rounded-full bg-white ring-1 ring-slate-200 shadow-[0_16px_40px_-24px_rgba(0,0,0,0.4)] flex items-center justify-center mb-6">
            <HeartOff className="w-7 h-7 text-brand-700" />
          </span>
          <h2 className="font-display text-2xl md:text-[28px] font-black text-slate-900 tracking-[-0.02em] mb-2">No favourites yet</h2>
          <p className="text-slate-500 text-[13px] max-w-xs leading-relaxed">
            Keep track of your favorite designs and products by tapping the heart icon on any item.
          </p>
          <Link to="/products"
            className="mt-7 inline-flex items-center gap-2 px-7 py-3 rounded-full bg-slate-900 text-white text-[12px] font-bold uppercase tracking-[0.14em] no-underline transition-all duration-200 hover:bg-brand-700">
            <ShoppingBag className="w-4 h-4" />
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 md:py-10 pb-20">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
            {items.map((product, i) => (
              <div
                key={product._id}
                className="h-full animate-fade-in-up"
                style={{ animationDelay: `${Math.min(i, 11) * 45}ms`, animationFillMode: "both" }}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
