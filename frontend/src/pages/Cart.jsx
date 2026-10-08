import { useDispatch, useSelector } from "react-redux";
import { removeFromCart, updateQuantity, selectCartTotal, selectCartDelivery, makeCartKey } from "../features/cart/cartSlice";
import { useNavigate, Link } from "react-router-dom";
import { ShoppingCart, AlertCircle, CheckCircle2, Minus, Plus, X, ArrowRight, ArrowLeft } from "lucide-react";

export default function Cart() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items } = useSelector((s) => s.cart);
  const total = useSelector(selectCartTotal);
  const delivery = useSelector(selectCartDelivery);
  const { user } = useSelector((s) => s.auth);

  if (items.length === 0) return (
    <div className="bg-[#f7fafc] min-h-[50vh] flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="w-20 h-20 rounded-full bg-white ring-1 ring-slate-200 shadow-[0_16px_40px_-24px_rgba(0,0,0,0.4)] flex items-center justify-center mb-6">
        <ShoppingCart className="w-7 h-7 text-brand-700" />
      </span>
      <h2 className="font-display text-2xl md:text-[28px] font-black text-slate-900 tracking-[-0.02em] mb-2">Your cart is empty</h2>
      <p className="text-slate-500 text-[13px] max-w-xs leading-relaxed">Looks like you haven't added any products yet.</p>
      <Link to="/products"
        className="mt-7 inline-flex items-center gap-2 px-7 py-3 rounded-full bg-slate-900 text-white text-[12px] font-bold uppercase tracking-[0.14em] no-underline transition-all duration-200 hover:bg-brand-700">
        Start Shopping
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );

  return (
    <div className="bg-[#f7fafc] min-h-[80vh]">
      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200/70">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-4 md:py-5 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="font-display text-[21px] md:text-[25px] font-black text-slate-900 tracking-[-0.02em] leading-none m-0">
              Cart
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </div>

          <Link to="/products"
            className="hidden sm:inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 no-underline transition-colors hover:text-brand-700">
            <ArrowLeft className="w-3.5 h-3.5" />
            Continue Shopping
          </Link>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-8 pb-20">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
          {/* ── Items ── */}
          <div className="flex-1 min-w-0 w-full bg-white rounded-[20px] ring-1 ring-slate-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="hidden md:flex items-center gap-4 px-6 py-3 border-b border-slate-200/70 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              <span className="flex-[2]">Product</span>
              <span className="w-28 text-center">Quantity</span>
              <span className="w-24 text-right">Total</span>
              <span className="w-10" />
            </div>

            <div className="flex flex-col divide-y divide-slate-200/60">
              {items.map((item, i) => {
                const key = makeCartKey(item._id, item.size);
                return (
                <div key={key}
                  className="group flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 px-4 md:px-6 py-3 transition-colors duration-200 hover:bg-slate-50/70 animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms`, animationFillMode: "both" }}>
                  <div className="flex gap-3.5 flex-[2] min-w-0 w-full sm:w-auto">
                    <div
                      className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-[#f1f5f8] ring-1 ring-slate-200/70 cursor-pointer transition-all duration-300 group-hover:ring-slate-300 group-hover:shadow-[0_8px_18px_-12px_rgba(0,0,0,0.45)]"
                      onClick={() => navigate(`/products/${item._id}`)}>
                      <img src={item.image || "https://placehold.co/100x100/f5f5f5/999?text=Item"} alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-[600ms] group-hover:scale-[1.05]" />
                    </div>

                    <div className="min-w-0 flex flex-col justify-center gap-1">
                      <p className="font-display text-slate-900 text-[14.5px] md:text-[15px] font-bold leading-snug tracking-[-0.01em] line-clamp-1 cursor-pointer m-0 transition-colors hover:text-brand-700"
                        onClick={() => navigate(`/products/${item._id}`)}>
                        {item.name}
                      </p>

                      <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                        <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-[0.16em]">{item.category}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-slate-500 text-[12px] font-semibold tabular-nums">
                          ₹{item.price.toLocaleString()} <span className="text-slate-400 font-normal">each</span>
                        </span>
                        {item.size && (
                          <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-brand-700 bg-brand-50 ring-1 ring-brand-100 px-2 py-0.5 rounded-full">
                            {item.size}
                          </span>
                        )}
                        {item.requiresCustomImage && !item.uploadedImage && (
                          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-amber-700 bg-amber-50 ring-1 ring-amber-100 px-2 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3" /> Image required
                          </span>
                        )}
                        {item.uploadedImage && (
                          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-emerald-700 bg-emerald-50 ring-1 ring-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Image ready
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-4">
                    <div className="flex items-center justify-center bg-white rounded-full ring-1 ring-slate-200 overflow-hidden transition-shadow duration-200 group-hover:ring-slate-300 sm:w-28">
                      <button aria-label="Decrease quantity"
                        className="w-9 h-8 flex items-center justify-center bg-transparent border-none cursor-pointer text-slate-500 hover:text-brand-700 transition-colors"
                        onClick={() => dispatch(updateQuantity({ key, quantity: Math.max(1, item.quantity - 1) }))}>
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-9 text-center text-[14px] font-bold text-slate-900 tabular-nums">{item.quantity}</span>
                      <button aria-label="Increase quantity"
                        className="w-9 h-8 flex items-center justify-center bg-transparent border-none cursor-pointer text-slate-500 hover:text-brand-700 transition-colors"
                        onClick={() => dispatch(updateQuantity({ key, quantity: item.quantity + 1 }))}>
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="font-sans text-brand-700 text-[17px] sm:text-[18px] font-extrabold leading-none tracking-normal whitespace-nowrap tabular-nums m-0 sm:w-24 sm:text-right">
                      ₹{(item.price * item.quantity).toLocaleString()}
                    </p>

                    <div className="sm:w-10 flex justify-end">
                      <button aria-label="Remove item" title="Remove item"
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent border-none cursor-pointer text-slate-900 hover:text-brand-700 hover:bg-brand-50 transition-all duration-200"
                        onClick={() => dispatch(removeFromCart(key))}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          {/* ── Summary ── */}
          <div className="w-full lg:w-[310px] shrink-0 lg:sticky lg:top-28">
            <div className="bg-white rounded-[18px] ring-1 ring-slate-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-700 m-0 mb-4">
                Summary
              </h2>

              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 font-medium text-[13px]">Product cost</span>
                  <span className="font-sans text-slate-900 font-extrabold text-[14px] tabular-nums">₹{total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 font-medium text-[13px]">Delivery charges</span>
                  {delivery > 0
                    ? <span className="font-sans text-slate-900 font-extrabold text-[14px] tabular-nums">₹{delivery.toLocaleString()}</span>
                    : <span className="text-emerald-800 font-extrabold text-[11.5px] uppercase tracking-[0.12em]">Free</span>}
                </div>
              </div>

              <div className="border-t border-slate-300 mt-4 pt-4 flex items-baseline justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-900">Total</span>
                <span className="font-sans text-slate-900 text-[22px] font-extrabold leading-none tracking-normal tabular-nums">
                  ₹{(total + delivery).toLocaleString()}
                </span>
              </div>

              <button onClick={() => user ? navigate("/checkout") : navigate("/login")}
                className="w-full inline-flex items-center justify-center gap-2 mt-5 py-3 rounded-full bg-brand-700 text-white border-none text-[11.5px] font-bold uppercase tracking-[0.14em] cursor-pointer transition-all duration-200 hover:bg-brand-800 hover:shadow-[0_10px_24px_-12px_rgba(10, 91, 130,0.7)]">
                {user ? "Checkout" : "Login to Checkout"}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <Link to="/products"
                className="flex items-center justify-center gap-1.5 mt-3.5 text-slate-700 text-[11px] font-semibold no-underline transition-colors hover:text-brand-700">
                <ArrowLeft className="w-3.5 h-3.5" />
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
