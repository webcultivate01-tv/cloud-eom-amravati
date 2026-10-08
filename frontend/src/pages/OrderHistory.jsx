import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMyOrders, requestCancelOTP, cancelOrder } from "../features/orders/orderSlice";
import { toast } from "react-toastify";
import { downloadFile } from "../utils/download";
import { Link } from "react-router-dom";
import {
  Package, Lock, Mail, CreditCard, Banknote, Palette, MapPin, Truck, X,
  ExternalLink, Check, ShoppingBag, ArrowRight, ChevronDown, Clock, Download,
} from "lucide-react";

const STATUS_CLS = {
  Pending:    { badge: "bg-amber-50 text-amber-700 border-amber-200",     dot: "bg-amber-400" },
  Processing: { badge: "bg-blue-50 text-blue-700 border-blue-200",        dot: "bg-blue-400" },
  Printing:   { badge: "bg-purple-50 text-purple-700 border-purple-200",  dot: "bg-purple-400" },
  "Ready for Delivery": { badge: "bg-teal-50 text-teal-700 border-teal-200", dot: "bg-teal-500" },
  Shipped:    { badge: "bg-brand-50 text-brand-700 border-brand-200",     dot: "bg-brand-500" },
  Delivered:  { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  Cancelled:  { badge: "bg-red-50 text-red-700 border-red-200",           dot: "bg-red-500" },
};
const PAY_CLS = {
  paid:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  refunded: "bg-red-50 text-red-700 border-red-200",
  pending:  "bg-amber-50 text-amber-700 border-amber-200",
};
const STATUS_ORDER = ["Pending", "Processing", "Printing", "Ready for Delivery", "Shipped", "Delivered"];

/* Filter chips across the top — "All" plus the states worth separating out */
const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "In Progress", match: (o) => ["Pending", "Processing", "Printing", "Ready for Delivery", "Shipped"].includes(o.status) },
  { key: "delivered", label: "Delivered", match: (o) => o.status === "Delivered" },
  { key: "cancelled", label: "Cancelled", match: (o) => o.status === "Cancelled" },
];

const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function OrderHistory() {
  const dispatch = useDispatch();
  const { orders, loading } = useSelector((s) => s.orders);
  const [otpModal, setOtpModal] = useState(null);
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState({});
  const [billBusy, setBillBusy] = useState(null);

  const closeModal = () => { setOtpModal(null); setOtp(""); setOtpSent(false); };
  const toggle = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const handleRequestOTP = async (order) => {
    setOtpModal(order); setOtp(""); setOtpSent(false); setSendingOtp(true);
    const result = await dispatch(requestCancelOTP(order._id));
    setSendingOtp(false);
    if (!result.error) { setOtpSent(true); toast.success(result.payload?.message || "OTP sent to your email"); }
    else { toast.error(result.payload || "Failed to send OTP"); setOtpModal(null); }
  };

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) { toast.error("Enter the 6-digit OTP"); return; }
    setVerifying(true);
    const result = await dispatch(cancelOrder({ id: otpModal._id, otp: otp.trim() }));
    setVerifying(false);
    if (!result.error) { toast.success("Order cancelled successfully"); closeModal(); }
    else toast.error(result.payload || "Invalid OTP. Try again.");
  };

  const handleDownloadBill = async (order) => {
    setBillBusy(order._id);
    try {
      await downloadFile(`/invoice/${order._id}`, `Invoice-${order._id.slice(-8).toUpperCase()}.pdf`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBillBusy(null);
    }
  };

  useEffect(() => { dispatch(fetchMyOrders()); }, [dispatch]);

  const counts = useMemo(() => {
    const c = { all: orders.length };
    for (const f of FILTERS) if (f.match) c[f.key] = orders.filter(f.match).length;
    return c;
  }, [orders]);

  const visible = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter);
    return f?.match ? orders.filter(f.match) : orders;
  }, [orders, filter]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-brand-600 rounded-full animate-spin mb-4" />
      <div className="text-slate-400 font-medium text-sm">Loading your orders…</div>
    </div>
  );

  return (
    <div className="bg-[#f7fafc] min-h-[80vh]">

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 md:py-5 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="font-display text-[21px] md:text-[25px] font-black text-slate-900 tracking-[-0.02em] leading-none m-0">
              Orders
            </h1>
            {orders.length > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                {orders.length} {orders.length === 1 ? "order" : "orders"}
              </span>
            )}
          </div>

          <Link to="/products"
            className="hidden sm:inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 no-underline transition-colors hover:text-brand-700">
            <ShoppingBag className="w-3.5 h-3.5" />
            Continue Shopping
          </Link>
        </div>

        {/* Filter chips */}
        {orders.length > 0 && (
          <div className="max-w-6xl mx-auto px-4 md:px-8 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
            {FILTERS.map((f) => {
              const n = counts[f.key] ?? 0;
              const active = filter === f.key;
              if (f.key !== "all" && n === 0) return null;
              return (
                <button key={f.key} type="button" onClick={() => setFilter(f.key)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold border cursor-pointer transition-all ${
                    active
                      ? "bg-brand-600 border-brand-600 text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}>
                  {f.label}
                  <span className={`text-[10px] font-black px-1.5 rounded-full ${active ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
                    {n}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-20">

        {/* ── OTP Modal ── */}
        {otpModal && (
          <div className="fixed inset-0 bg-slate-900/60 z-[1000] flex items-center justify-center p-5 backdrop-blur-sm animate-fade-in-up" onClick={closeModal}>
            <div className="bg-white rounded-2xl p-7 max-w-sm w-full relative text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <button onClick={closeModal}
                className="absolute top-4 right-4 bg-slate-50 w-8 h-8 rounded-full border-none flex items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition-colors">
                <X className="w-4 h-4" />
              </button>

              <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7 text-brand-700" />
              </div>

              <h2 className="text-[18px] font-black text-slate-900 mb-1.5 m-0">Verify to Cancel</h2>
              <p className="text-slate-400 text-[12.5px] font-semibold mb-6 m-0 mt-1.5">
                Order {otpModal.orderNumber || otpModal._id.slice(-8).toUpperCase()} · ₹{otpModal.totalPrice?.toLocaleString()}
              </p>

              {sendingOtp ? (
                <div className="flex items-center justify-center gap-2 text-slate-500 text-[13px] bg-slate-50 rounded-xl px-4 py-4 font-semibold border border-slate-100">
                  <span className="w-4 h-4 border-2 border-slate-300 border-t-brand-600 rounded-full animate-spin" />
                  Sending OTP to your email…
                </div>
              ) : otpSent ? (
                <form onSubmit={handleConfirmCancel}>
                  <div className="flex gap-2.5 text-left bg-brand-50/70 border border-brand-100 text-brand-800 text-[12.5px] rounded-xl px-3.5 py-3 mb-5">
                    <Mail className="w-4 h-4 shrink-0 text-brand-600 mt-0.5" />
                    <p className="leading-relaxed m-0 font-medium">A 6-digit code has been sent to your registered email. Enter it below to confirm.</p>
                  </div>

                  <div className="flex gap-2 justify-between mb-5">
                    {[0,1,2,3,4,5].map((i) => (
                      <input key={i} id={`otp-box-${i}`} type="text" inputMode="numeric" maxLength={1}
                        className="w-11 h-12 text-center text-[18px] font-black border border-slate-200 rounded-xl outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10 text-slate-900 transition-all"
                        value={otp[i] || ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/, "");
                          const arr = otp.split(""); arr[i] = val;
                          setOtp(arr.join("").slice(0, 6));
                          if (val && i < 5) document.getElementById(`otp-box-${i + 1}`)?.focus();
                        }}
                        onKeyDown={(e) => { if (e.key === "Backspace" && !otp[i] && i > 0) document.getElementById(`otp-box-${i - 1}`)?.focus(); }}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2.5 justify-center mb-3.5">
                    <button type="button" onClick={() => handleRequestOTP(otpModal)} disabled={sendingOtp}
                      className="flex-1 bg-white border border-slate-200 text-slate-600 py-2.5 rounded-xl font-bold text-[12.5px] cursor-pointer hover:bg-slate-50 transition-colors">
                      Resend
                    </button>
                    <button type="submit" disabled={verifying || otp.length < 6}
                      className="flex-[2] bg-brand-600 border-none text-white py-2.5 rounded-xl font-bold text-[12.5px] cursor-pointer hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      {verifying ? "Verifying…" : "Confirm Cancel"}
                    </button>
                  </div>
                  <p className="text-slate-400 text-[11px] font-semibold flex items-center justify-center gap-1.5 m-0">
                    <Clock className="w-3 h-3" /> Expires in 10 minutes
                  </p>
                </form>
              ) : null}
            </div>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-14 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-5">
              <Package className="w-9 h-9 text-slate-300" />
            </div>
            <h2 className="text-[20px] font-black text-slate-900 mb-2 m-0">No orders yet</h2>
            <p className="text-slate-400 text-[13.5px] font-medium mb-7 max-w-sm m-0 mt-2 leading-relaxed">
              You haven't placed any orders yet. Browse the catalogue and your first order will show up here.
            </p>
            <Link to="/products"
              className="inline-flex items-center gap-2 bg-brand-600 text-white px-7 py-3 rounded-xl font-bold text-[13.5px] no-underline hover:bg-brand-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
              Browse Products <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-12 text-center">
            <p className="text-slate-400 text-[13.5px] font-semibold m-0">No orders in this category.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {visible.map((order) => {
              const st = STATUS_CLS[order.status] || STATUS_CLS.Pending;
              const payCls = PAY_CLS[order.paymentStatus] || PAY_CLS.pending;
              const currentIdx = STATUS_ORDER.indexOf(order.status);
              const cancelled = order.status === "Cancelled";
              const cancellable = ["Pending", "Processing"].includes(order.status);
              const isOpen = expanded[order._id];
              const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);
              const firstItem = order.items[0];

              return (
                <article key={order._id} className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden transition-shadow hover:shadow-md">

                  {/* ── Card head ── */}
                  <div className="flex flex-wrap justify-between items-center gap-3 px-5 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 text-[13.5px] m-0 leading-tight tracking-tight">
                        {order.orderNumber || order._id.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-slate-400 text-[11.5px] font-semibold m-0 mt-1">
                        {fmtDate(order.createdAt)} · {itemCount} {itemCount === 1 ? "item" : "items"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wider ${st.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{order.status}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wider ${payCls}`}>
                        {order.paymentMethod === "razorpay" ? <CreditCard className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                        {order.paymentStatus === "paid" ? "Paid" : order.paymentStatus === "refunded" ? "Refunded" : "Pending"}
                      </span>
                      <span className="font-black text-slate-900 text-[15px] ml-1 tracking-tight" title={order.deliveryCharge > 0 ? `Product ₹${(order.totalPrice - order.deliveryCharge).toLocaleString()} + delivery ₹${order.deliveryCharge.toLocaleString()}` : undefined}>₹{order.totalPrice.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* ── Compact summary line (always visible) ── */}
                  <button type="button" onClick={() => toggle(order._id)}
                    className={`w-full flex items-center gap-3 px-5 md:px-6 py-3.5 bg-white hover:bg-slate-50/60 transition-colors text-left border-none cursor-pointer ${isOpen ? "border-b border-slate-100" : ""}`}>
                    <img src={firstItem?.product?.image || "https://placehold.co/64x64/f5f5f5/999?text=Item"} alt=""
                      className="w-10 h-10 object-cover rounded-lg border border-slate-100 bg-slate-50 shrink-0" />
                    <p className="flex-1 min-w-0 font-bold text-slate-900 text-[13px] m-0 truncate">
                      {firstItem?.name}
                      {order.items.length > 1 && (
                        <span className="text-slate-400 font-semibold"> +{order.items.length - 1} more</span>
                      )}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-brand-600 shrink-0">
                      {isOpen ? "Hide Details" : "View Details"}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </span>
                  </button>

                  {isOpen && (
                    <>
                      {/* ── Progress rail ── */}
                      {!cancelled && (
                        <div className="px-5 md:px-6 pt-5 pb-1">
                          <div className="relative flex items-start justify-between">
                            <div className="absolute top-[13px] left-0 right-0 h-[3px] bg-slate-100 rounded-full">
                              <div className="h-full bg-brand-600 rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(0, (currentIdx / (STATUS_ORDER.length - 1)) * 100)}%` }} />
                            </div>
                            {STATUS_ORDER.map((s2, i) => {
                              const done = i <= currentIdx;
                              const current = i === currentIdx;
                              return (
                                <div key={s2} className="relative z-10 flex flex-col items-center flex-1 first:items-start last:items-end">
                                  <span className={`w-[27px] h-[27px] rounded-full flex items-center justify-center shrink-0 transition-all duration-300 border-[3px] border-white ${
                                    done ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-400"
                                  } ${current ? "ring-4 ring-brand-100" : ""}`}>
                                    {done ? <Check className="w-3.5 h-3.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                  </span>
                                  <span className={`text-[10px] md:text-[10.5px] font-bold mt-2 text-center leading-tight ${done ? "text-slate-700" : "text-slate-300"}`}>
                                    {s2}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* ── Items ── */}
                      <div className="px-5 md:px-6 py-4 flex flex-col gap-3.5">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex items-center gap-3.5">
                            <img src={item.product?.image || "https://placehold.co/64x64/f5f5f5/999?text=Item"} alt={item.name}
                              className="w-14 h-14 md:w-16 md:h-16 object-cover rounded-xl border border-slate-100 bg-slate-50 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900 text-[13.5px] m-0 leading-tight truncate">{item.name}</p>
                              <p className="text-slate-400 text-[11.5px] font-semibold m-0 mt-1 flex items-center gap-2 flex-wrap">
                                Qty {item.quantity} × ₹{item.price.toLocaleString()}
                                {item.size && (
                                  <span className="bg-brand-50 text-brand-700 border border-brand-100 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    {item.size}
                                  </span>
                                )}
                              </p>
                              {item.uploadedImage && (
                                <a href={item.uploadedImage} target="_blank" rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 text-brand-700 text-[11px] font-bold bg-brand-50 px-2 py-0.5 rounded mt-1.5 no-underline hover:bg-brand-100 transition-colors w-fit">
                                  <Palette className="w-3 h-3" /> View Design <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                            <p className="font-black text-slate-900 text-[14px] shrink-0 m-0">₹{(item.price * item.quantity).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>

                      {/* ── Footer: address, tracking, actions ── */}
                      <div className="px-5 md:px-6 py-4 border-t border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex flex-col gap-2 min-w-0">
                          <p className="flex items-start gap-2 text-slate-500 text-[12px] font-medium m-0 leading-relaxed">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-300 mt-0.5" />
                            {order.shippingAddress?.address}, {order.shippingAddress?.city} – {order.shippingAddress?.pincode}
                          </p>
                          {order.shipment?.trackingId && (
                            <p className="flex items-center gap-2 text-slate-600 text-[12px] font-semibold bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 w-fit m-0">
                              <Truck className="w-3.5 h-3.5 shrink-0 text-brand-500" />
                              {order.shipment.courierName} · AWB <strong className="text-brand-700">{order.shipment.trackingId}</strong>
                            </p>
                          )}
                        </div>

                        <div className="shrink-0">
                          {cancelled ? (
                            <span className="inline-block bg-red-50 text-red-700 border border-red-200 font-bold px-3.5 py-2 rounded-lg text-[12px] uppercase tracking-wider">
                              Cancelled
                            </span>
                          ) : cancellable ? (
                            <button onClick={() => handleRequestOTP(order)}
                              className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold text-[12px] cursor-pointer hover:border-red-200 hover:text-red-600 hover:bg-red-50/50 transition-all active:scale-95 w-full sm:w-auto justify-center">
                              <X className="w-3.5 h-3.5" /> Cancel Order
                            </button>
                          ) : order.status === "Delivered" ? (
                            <div className="flex flex-col sm:flex-row gap-2">
                              {/* The same tax invoice the shop holds — customers
                                  ask for it far more often than they ask us. */}
                              <button onClick={() => handleDownloadBill(order)}
                                disabled={billBusy === order._id}
                                className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold text-[12px] cursor-pointer hover:border-brand-200 hover:text-brand-700 transition-all active:scale-95 disabled:opacity-50 w-full sm:w-auto justify-center">
                                <Download className="w-3.5 h-3.5" />
                                {billBusy === order._id ? "Preparing…" : "Download Bill"}
                              </button>
                              <Link to="/replacements"
                                className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold text-[12px] no-underline hover:border-brand-200 hover:text-brand-700 transition-all w-full sm:w-auto justify-center">
                                Request Replacement <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          ) : (
                            <span className="inline-block text-slate-400 text-[11.5px] font-semibold">
                              Cannot be cancelled at this stage
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
