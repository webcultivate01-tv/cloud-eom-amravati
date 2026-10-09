import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { placeOrder, resetOrderState } from "../features/orders/orderSlice";
import { createRazorpayOrder, verifyAndPlaceOrder, resetPayment } from "../features/payment/paymentSlice";
import { clearCart, selectCartTotal, selectCartDelivery, setItemImage, makeCartKey } from "../features/cart/cartSlice";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../utils/api";
import { downloadFile } from "../utils/download";
import { loadRazorpay } from "../utils/loadRazorpay";
import { validateImageFile } from "../utils/uploadLimits";
import DropdownSelect from "../components/DropdownSelect";
import {
  Package, MapPin, Palette, CheckCircle2, CreditCard, Banknote, ShieldCheck, Home, Briefcase,
  Image as ImageIcon, Upload, AlertTriangle, Ban, Info, ChevronRight, ChevronLeft, Check,
  Lock, Truck, RotateCcw, Pencil, Download,
} from "lucide-react";

const INDIAN_STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"];
const ADDR_TYPES = ["Home", "Work", "Other"];

/* The four stages of the flow. `caption` is what the rail shows underneath the
   label — it tells the customer what that step is actually for, which is the
   difference between a wizard and a numbered list. */
const STEPS = [
  { id: 1, label: "Shipping", caption: "Where it goes",   Icon: MapPin },
  { id: 2, label: "Designs",  caption: "What we print",   Icon: Palette },
  { id: 3, label: "Review",   caption: "Check it over",   Icon: CheckCircle2 },
  { id: 4, label: "Payment",  caption: "Confirm & pay",   Icon: CreditCard },
];

/* Reassurance strip under the summary — standard for a checkout of this kind */
const TRUST = [
  { Icon: Lock, text: "256-bit secure payment" },
  { Icon: Truck, text: "Free delivery on this order" },
  { Icon: RotateCcw, text: "Easy replacement policy" },
];

/* Section head shared by all four stages — module scope, so switching steps
   never remounts it. */
const SectionHead = ({ Icon, title, sub }) => (
  <div className="px-5 md:px-7 py-4 border-b border-slate-100 flex items-center gap-3">
    <span className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
      <Icon className="w-[18px] h-[18px]" />
    </span>
    <div className="min-w-0">
      <h2 className="text-[15px] font-black text-slate-900 m-0 leading-tight tracking-tight">{title}</h2>
      <p className="text-[11.5px] text-slate-500 font-medium m-0 mt-0.5">{sub}</p>
    </div>
  </div>
);

export default function Checkout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items } = useSelector((s) => s.cart);
  const subtotal = useSelector(selectCartTotal);
  const productDelivery = useSelector(selectCartDelivery);
  const { loading: orderLoading, success: orderSuccess, error: orderError, createdOrder: codCreatedOrder } = useSelector((s) => s.orders);
  const { loading: payLoading, success: paySuccess, error: payError, createdOrder: payCreatedOrder } = useSelector((s) => s.payment);
  const { user } = useSelector((s) => s.auth);

  const [shipping, setShipping] = useState({ fullName: "", phone: "", address: "", addressLine2: "", landmark: "", city: "", state: "", pincode: "", addressType: "Home" });
  const [note, setNote] = useState("");
  const [uploadingFor, setUploadingFor] = useState(null);
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [upiId, setUpiId] = useState("");
  const [placedOrder, setPlacedOrder] = useState(null);
  const [billBusy, setBillBusy] = useState(false);
  const loading = orderLoading || payLoading;

  /* The admin's pincode rate for the delivery address, if the pincode has one.
     Without it the products' own per-unit charges apply. The server re-prices
     the order itself, so this only drives what the customer sees and pays. */
  const [quote, setQuote] = useState(null); // { pincode, found, charge, chargeType }
  useEffect(() => {
    if (!/^\d{6}$/.test(shipping.pincode)) return;
    let cancelled = false;
    api.get("/delivery/quote", { params: { pincode: shipping.pincode } })
      .then(({ data }) => { if (!cancelled) setQuote({ ...data, pincode: shipping.pincode }); })
      .catch(() => { if (!cancelled) setQuote(null); });
    return () => { cancelled = true; };
  }, [shipping.pincode]);
  // Ignore a quote fetched for a pincode the customer has since changed
  const zone = quote?.found && quote.pincode === shipping.pincode ? quote : null;

  const units = items.reduce((n, i) => n + (Number(i.quantity) || 0), 0);
  const delivery = zone
    ? (zone.chargeType === "per_unit" ? zone.charge * units : zone.charge)
    : productDelivery;
  const pinEntered = /^\d{6}$/.test(shipping.pincode); // until then the delivery charge is unknown
  const total = subtotal + delivery; // everything the customer pays: product cost + delivery

  useEffect(() => {
    if (orderSuccess || paySuccess) {
      const order = payCreatedOrder || codCreatedOrder;
      dispatch(clearCart()); dispatch(resetOrderState()); dispatch(resetPayment());
      setPlacedOrder({
        orderId: order?._id || "",
        paymentMethod: order?.paymentMethod || paymentMethod,
        totalPrice: order?.totalPrice,
      });
    }
  }, [orderSuccess, paySuccess]);

  useEffect(() => {
    if (orderError) toast.error(orderError);
    if (payError) toast.error(payError);
  }, [orderError, payError]);

  /* Scroll back to the top of the flow whenever the stage changes — on mobile
     the next step otherwise opens halfway down the page. */
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

  const missingImages = items.filter((i) => i.requiresCustomImage && !i.uploadedImage);

  /* Direct-sale (ready to ship) products have nothing to print, so a cart made
     only of those skips the Designs stage entirely. */
  const hasDesigns = items.some((i) => i.requiresCustomImage);
  const steps = hasDesigns ? STEPS : STEPS.filter((s) => s.id !== 2);
  const stepIndex = steps.findIndex((s) => s.id === step);
  const afterShipping = hasDesigns ? 2 : 3;
  const beforeReview = hasDesigns ? 2 : 1;

  // Default payment method based on cart contents — if any item disallows COD, force razorpay.
  const codBlockedItems = items.filter((i) => i.allowCOD === false);
  const codAllowed = codBlockedItems.length === 0;

  useEffect(() => {
    if (!codAllowed && paymentMethod === "cod") {
      setPaymentMethod("razorpay");
    }
  }, [codAllowed, paymentMethod]);

  const handleImageUpload = async (e, itemKey) => {
    const file = e.target.files[0]; if (!file) return;
    // This file is what actually gets printed, so it is stored uncompressed —
    // which makes the size cap worth catching before the upload starts
    const problem = validateImageFile(file);
    if (problem) { toast.error(problem); e.target.value = ""; return; }
    setUploadingFor(itemKey);
    try {
      const fd = new FormData(); fd.append("image", file);
      const { data } = await api.post("/upload?folder=orders", fd, { headers: { "Content-Type": "multipart/form-data" } });
      dispatch(setItemImage({ key: itemKey, imageUrl: data.imageUrl }));
      toast.success("Image uploaded successfully");
    } catch { toast.error("Upload failed. Try again."); }
    finally { setUploadingFor(null); }
  };

  const buildOrderItems = () => items.map((item) => ({
    product: item._id,
    quantity: item.quantity,
    size: item.size || "",
    uploadedImage: item.uploadedImage || "",
  }));

  const validateShipping = () => {
    if (!shipping.fullName.trim()) { toast.error("Enter your full name"); return false; }
    if (!shipping.phone.trim() || !/^\d{10}$/.test(shipping.phone.trim())) { toast.error("Enter a valid 10-digit phone number"); return false; }
    if (!shipping.address.trim()) { toast.error("Enter your address"); return false; }
    if (!shipping.city.trim()) { toast.error("Enter your city"); return false; }
    if (!shipping.state) { toast.error("Select your state"); return false; }
    if (!shipping.pincode.trim() || !/^\d{6}$/.test(shipping.pincode.trim())) { toast.error("Enter a valid 6-digit pincode"); return false; }
    return true;
  };

  const handleCOD = () => {
    if (missingImages.length > 0) { toast.error(`Upload image for: ${missingImages.map((i) => i.name).join(", ")}`); return; }
    dispatch(placeOrder({ items: buildOrderItems(), shippingAddress: shipping, customerNote: note, paymentMethod: "cod" }));
  };

  const handleRazorpay = async () => {
    if (missingImages.length > 0) { toast.error(`Upload image for: ${missingImages.map((i) => i.name).join(", ")}`); return; }
    try { await loadRazorpay(); } catch { toast.error("Could not load the payment gateway. Check your connection and try again."); return; }
    const result = await dispatch(createRazorpayOrder(total));
    if (result.error) return;
    const { razorpayOrderId, amount, currency, keyId } = result.payload;
    const options = {
      key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID, amount, currency,
      name: "Cloud Graphics Amravati", description: "Custom Print Products", order_id: razorpayOrderId,
      prefill: { name: user?.name || shipping.fullName, email: user?.email || "", contact: shipping.phone, vpa: upiId.trim() || undefined },
      theme: { color: "#05618e" },
      handler: async (response) => {
        await dispatch(verifyAndPlaceOrder({ ...response, items: buildOrderItems(), shippingAddress: shipping, customerNote: note }));
      },
      modal: { ondismiss: () => toast.info("Payment cancelled. You can try again.") },
    };
    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (resp) => toast.error(`Payment failed: ${resp.error.description}`));
    rzp.open();
  };

  const handleDownloadBill = async () => {
    setBillBusy(true);
    try {
      await downloadFile(`/invoice/${placedOrder.orderId}`, `Bill-${placedOrder.orderId.slice(-8).toUpperCase()}.pdf`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBillBusy(false);
    }
  };

  const handlePayNow = () => paymentMethod === "cod" ? handleCOD() : handleRazorpay();

  /* Shown over the checkout once the order is placed. The cart is cleared at that
     moment, so this is rendered from both the normal and the empty-cart return. */
  const successModal = placedOrder && (() => {
    const isCOD = placedOrder.paymentMethod === "cod";
    const shortId = placedOrder.orderId ? placedOrder.orderId.slice(-8).toUpperCase() : "";
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4" role="dialog" aria-modal="true">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 text-center animate-fade-in-up">
          <div className="w-20 h-20 rounded-full bg-[#1b7f3b] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#1b7f3b]/30">
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 m-0 mb-1.5">
            {isCOD ? "Order Placed!" : "Payment Successful!"}
          </h2>
          <p className="text-slate-600 text-[13.5px] font-medium m-0 mb-5">
            {isCOD ? "Your order has been placed. Pay in cash on delivery." : "Your payment was confirmed and your order is placed."}
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5 text-left flex flex-col gap-2.5">
            {shortId && (
              <div className="flex justify-between text-[13px]">
                <span className="text-slate-600 font-semibold">Order ID</span>
                <span className="text-slate-900 font-black tracking-wider">#{shortId}</span>
              </div>
            )}
            {placedOrder.totalPrice != null && (
              <div className="flex justify-between text-[13px]">
                <span className="text-slate-600 font-semibold">{isCOD ? "Pay on delivery" : "Amount paid"}</span>
                <span className="text-slate-900 font-black">₹{placedOrder.totalPrice.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="flex justify-between text-[13px]">
              <span className="text-slate-600 font-semibold">Payment method</span>
              <span className="text-slate-900 font-bold">{isCOD ? "Cash on Delivery" : "Online Payment"}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {placedOrder.orderId && (
              <button onClick={handleDownloadBill} disabled={billBusy} className="w-full inline-flex items-center justify-center gap-2 bg-white border border-brand-600 text-brand-700 px-7 py-3 rounded-xl font-bold text-[13.5px] cursor-pointer hover:bg-brand-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                <Download className="w-4 h-4" /> {billBusy ? "Preparing bill…" : "Download Bill"}
              </button>
            )}
            <button onClick={() => navigate("/orders", { replace: true })} className="w-full inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-7 py-3 rounded-xl font-bold text-[13.5px] border-none cursor-pointer transition-all shadow-md">
              <Package className="w-4 h-4" /> View My Orders
            </button>
            <button onClick={() => navigate("/products", { replace: true })} className="w-full inline-flex items-center justify-center bg-white border border-slate-200 text-slate-600 px-5 py-3 rounded-xl font-bold text-[13.5px] cursor-pointer hover:bg-slate-50 transition-all">
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  })();

  if (items.length === 0) return (
    <>
    {successModal}
    {!placedOrder && <div className="text-center py-24 bg-[#f7fafc] min-h-[70vh] flex flex-col items-center justify-center px-4">
      <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 border border-slate-100">
        <Package className="w-10 h-10 text-slate-300" />
      </div>
      <h2 className="text-2xl font-black text-slate-900 mb-2">Checkout Unavailable</h2>
      <p className="text-slate-600 mb-8 max-w-md">Your cart is empty. Please add some products to your cart before proceeding to checkout.</p>
      <Link to="/products" className="bg-brand-600 text-white px-8 py-3.5 rounded-xl font-bold text-sm no-underline hover:bg-brand-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">Shop Now</Link>
    </div>}
    </>
  );

  const inputCls =
    "w-full px-4 py-3 border border-slate-200 rounded-xl text-[13.5px] bg-white text-slate-800 placeholder-slate-600 placeholder:opacity-100 " +
    "outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10 transition-all box-border font-[inherit]";
  const labelCls = "block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2";
  const cardCls = "bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden";
  const backBtn = "inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-5 py-3 rounded-xl font-bold text-[13.5px] cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all";
  const nextBtn = "inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-7 py-3 rounded-xl font-bold text-[13.5px] border-none cursor-pointer transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5";

  return (
    <div className="bg-[#f7fafc] min-h-[80vh]">
      {successModal}

      {/* ── Secure checkout header ── */}
      <header className="bg-white border-b border-slate-200/70 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3.5 md:py-4 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="font-display text-[20px] md:text-[24px] font-black text-slate-900 tracking-[-0.02em] leading-none m-0">
              Checkout
            </h1>
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-600">
              <Lock className="w-3.5 h-3.5" /> Secure
            </span>
            <Link to="/cart" className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 no-underline hover:text-brand-700 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" /> Cart
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-20">

        {/* ── Step rail ── */}
        <nav className={`${cardCls} mb-6 px-3 md:px-5 py-4`} aria-label="Checkout progress">
          <ol className="flex items-start gap-0 m-0 p-0 list-none">
            {steps.map(({ id, label, caption, Icon }, i) => {
              const done = step > id;
              const current = step === id;
              /* Going back is allowed; skipping ahead is not */
              const reachable = id < step;
              return (
                <li key={id} className="flex-1 flex items-start min-w-0">
                  <button
                    type="button"
                    onClick={() => reachable && setStep(id)}
                    disabled={!reachable}
                    className={`flex items-center gap-2.5 min-w-0 bg-transparent border-none p-0 text-left ${reachable ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <span
                      className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                        done
                          ? "bg-brand-600 text-white shadow-md shadow-brand-600/25"
                          : current
                            ? "bg-white text-brand-700 ring-2 ring-brand-600 shadow-sm"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {done ? <Check className="w-[18px] h-[18px]" /> : <Icon className="w-[17px] h-[17px]" />}
                    </span>
                    <span className="hidden md:block min-w-0">
                      <span className={`block text-[13px] font-bold leading-tight truncate ${current || done ? "text-slate-900" : "text-slate-500"}`}>
                        {label}
                      </span>
                      <span className={`block text-[11px] font-medium leading-tight mt-0.5 truncate ${current ? "text-brand-600" : "text-slate-500"}`}>
                        {caption}
                      </span>
                    </span>
                  </button>

                  {i < steps.length - 1 && (
                    <span className="flex-1 h-[3px] rounded-full bg-slate-100 mx-2 md:mx-3 mt-[18px] md:mt-[20px] overflow-hidden min-w-[12px]">
                      <span
                        className="block h-full bg-brand-600 rounded-full transition-all duration-500"
                        style={{ width: done ? "100%" : "0%" }}
                      />
                    </span>
                  )}
                </li>
              );
            })}
          </ol>

          {/* Mobile: the rail collapses to icons, so name the current stage here */}
          <div className="md:hidden mt-3.5 pt-3.5 border-t border-slate-100">
            <p className="text-[13px] font-black text-slate-900 m-0 leading-tight">
              Step {stepIndex + 1} of {steps.length} · {steps[stepIndex].label}
            </p>
            <p className="text-[11.5px] text-slate-500 font-medium m-0 mt-0.5">{steps[stepIndex].caption}</p>
          </div>
        </nav>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 w-full">

            {/* ── Step 1: Shipping ── */}
            {step === 1 && (
              <div className={`${cardCls} animate-fade-in-up`}>
                <SectionHead Icon={MapPin} title="Delivery Address" sub="Where should this order arrive?" />

                <div className="px-5 md:px-7 py-6">
                  <div className="mb-6">
                    <label className={labelCls}>Address Type</label>
                    <div className="flex gap-2.5 flex-wrap">
                      {ADDR_TYPES.map((t) => (
                        <button key={t} type="button" onClick={() => setShipping({ ...shipping, addressType: t })}
                          className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-[13px] font-bold cursor-pointer transition-all ${
                            shipping.addressType === t
                              ? "border-brand-600 bg-brand-50 text-brand-700 shadow-sm"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          }`}>
                          {t === "Home" ? <Home className="w-4 h-4" /> : t === "Work" ? <Briefcase className="w-4 h-4" /> : <MapPin className="w-4 h-4" />} {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className={labelCls}>Full Name *</label>
                      <input className={inputCls} placeholder="Your full name" value={shipping.fullName} onChange={(e) => setShipping({ ...shipping, fullName: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>Phone Number *</label>
                      <input className={inputCls} placeholder="10-digit mobile number" inputMode="numeric" value={shipping.phone} onChange={(e) => setShipping({ ...shipping, phone: e.target.value.replace(/\D/g, "") })} maxLength={10} />
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className={labelCls}>Address Line 1 *</label>
                    <input className={inputCls} placeholder="House no, building, street" value={shipping.address} onChange={(e) => setShipping({ ...shipping, address: e.target.value })} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className={labelCls}>Address Line 2 <span className="normal-case font-medium text-slate-500">(optional)</span></label>
                      <input className={inputCls} placeholder="e.g. Opposite Bus Stand" value={shipping.addressLine2} onChange={(e) => setShipping({ ...shipping, addressLine2: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>Landmark <span className="normal-case font-medium text-slate-500">(optional)</span></label>
                      <input className={inputCls} placeholder="e.g. Near City Mall" value={shipping.landmark} onChange={(e) => setShipping({ ...shipping, landmark: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className={labelCls}>City / Town *</label>
                      <input className={inputCls} placeholder="City" value={shipping.city} onChange={(e) => setShipping({ ...shipping, city: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>Pincode *</label>
                      {!zone && <p className="text-[11px] text-slate-500 font-medium m-0 mb-1">Delivery charges depend on your PIN code</p>}
                      <input className={inputCls} placeholder="6-digit pincode" inputMode="numeric" value={shipping.pincode} onChange={(e) => setShipping({ ...shipping, pincode: e.target.value.replace(/\D/g, "") })} maxLength={6} />
                      {zone && (
                        <p className="text-[11.5px] font-semibold text-emerald-700 mt-1.5 m-0">
                          {zone.charge > 0
                            ? `Delivery to ${shipping.pincode}: ₹${zone.charge.toLocaleString()} ${zone.chargeType === "per_unit" ? "per item" : "per order"}`
                            : `Free delivery to ${shipping.pincode}`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className={labelCls}>State *</label>
                    <DropdownSelect className={inputCls} value={shipping.state} placeholder="— Select State —" options={INDIAN_STATES} onChange={(e) => setShipping({ ...shipping, state: e.target.value })} />
                  </div>

                  <div>
                    <label className={labelCls}>Order Note <span className="normal-case font-medium text-slate-500">(optional)</span></label>
                    <textarea className={`${inputCls} h-24 resize-y`} placeholder="Special instructions for delivery..." value={note} onChange={(e) => setNote(e.target.value)} />
                  </div>
                </div>

                <div className="px-5 md:px-7 py-4 border-t border-slate-100 bg-slate-50/60 flex justify-end">
                  <button onClick={() => { if (validateShipping()) setStep(afterShipping); }} className={`${nextBtn} w-full sm:w-auto`}>
                    {hasDesigns ? "Continue to Designs" : "Review Order"} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2: Designs ── */}
            {step === 2 && (
              <div className={`${cardCls} animate-fade-in-up`}>
                <SectionHead Icon={Palette} title="Upload Your Designs" sub="The artwork we'll send to the press" />

                <div className="px-5 md:px-7 py-6">
                  <div className="bg-brand-50/70 border border-brand-100 rounded-xl p-4 flex gap-3 mb-5 items-start">
                    <Info className="w-[18px] h-[18px] text-brand-600 mt-0.5 shrink-0" />
                    <p className="text-brand-800 text-[13px] m-0 leading-relaxed font-medium">
                      Upload the highest quality file you have. We print it exactly as provided — a blurry
                      upload prints blurry, so send the original rather than a screenshot.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    {items.map((item) => {
                      const itemKey = makeCartKey(item._id, item.size);
                      const customisable = item.requiresCustomImage;
                      return (
                        <div key={itemKey}
                          className={`flex gap-4 p-4 border rounded-xl items-start sm:items-center flex-col sm:flex-row transition-colors ${
                            item.uploadedImage
                              ? "border-emerald-200 bg-emerald-50/40"
                              : item.requiresCustomImage
                                ? "border-amber-200 bg-amber-50/40"
                                : "border-slate-200 bg-slate-50/50"
                          }`}>
                          <div className="flex items-center gap-3.5 w-full sm:w-auto flex-1 min-w-0">
                            <div className="relative shrink-0">
                              <img src={item.image || "https://placehold.co/60x60/f5f5f5/999"} alt={item.name}
                                className="w-14 h-14 object-cover rounded-xl bg-white border border-slate-200 shadow-sm" />
                              {item.uploadedImage && (
                                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center ring-2 ring-white">
                                  <Check className="w-3 h-3 text-white" />
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-900 text-[13.5px] mb-1.5 flex items-center gap-2 flex-wrap leading-tight">
                                {item.name}
                                {item.size && <span className="bg-white text-slate-600 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{item.size}</span>}
                                {item.requiresCustomImage && <span className="bg-brand-50 text-brand-700 border border-brand-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Required</span>}
                              </p>
                              <p className="text-slate-500 text-[11.5px] font-semibold">Qty: {item.quantity}</p>
                            </div>
                          </div>

                          <div className="w-full sm:w-auto shrink-0">
                            {customisable ? (
                              <div className="flex flex-col gap-2 sm:items-end">
                                <input type="file" accept="image/*" id={`upload-${itemKey}`} className="hidden" onChange={(e) => handleImageUpload(e, itemKey)} />
                                <label htmlFor={`upload-${itemKey}`}
                                  className={`inline-flex items-center justify-center gap-2 border rounded-xl px-4 py-2.5 cursor-pointer text-[12.5px] font-bold w-full sm:w-auto transition-all ${
                                    item.uploadedImage
                                      ? "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                                      : "bg-brand-600 border-brand-600 text-white hover:bg-brand-700 shadow-sm"
                                  }`}>
                                  {uploadingFor === itemKey ? (
                                    <><span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Uploading…</>
                                  ) : item.uploadedImage ? (
                                    <><ImageIcon className="w-3.5 h-3.5" /> Change Image</>
                                  ) : (
                                    <><Upload className="w-3.5 h-3.5" /> Choose Image</>
                                  )}
                                </label>

                                <div className="h-5 flex items-center justify-start sm:justify-end">
                                  {item.uploadedImage ? (
                                    <span className="flex items-center gap-1.5 text-emerald-700 text-[11.5px] font-bold">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Ready for print
                                    </span>
                                  ) : item.requiresCustomImage ? (
                                    <span className="flex items-center gap-1.5 text-amber-600 text-[11.5px] font-bold">
                                      <AlertTriangle className="w-3.5 h-3.5" /> Image required
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-block bg-white border border-slate-200 px-4 py-2 rounded-lg text-slate-500 text-[11.5px] font-bold text-center">
                                No design needed
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {missingImages.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 mt-5 items-start">
                      <Ban className="w-[18px] h-[18px] text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-800 font-bold text-[13px] mb-1 m-0">Uploads Required</p>
                        <p className="text-red-700 text-[13px] m-0">Please upload images for <strong>{missingImages.map((i) => i.name).join(", ")}</strong> before proceeding.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-5 md:px-7 py-4 border-t border-slate-100 bg-slate-50/60 flex gap-3 justify-between">
                  <button onClick={() => setStep(1)} className={backBtn}>
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={() => { if (missingImages.length > 0) { toast.error("Upload required images first"); return; } setStep(3); }}
                    className={`${nextBtn} ${missingImages.length > 0 ? "opacity-50 hover:-translate-y-0 hover:shadow-md cursor-not-allowed" : ""}`}>
                    Review Order <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Review ── */}
            {step === 3 && (
              <div className={`${cardCls} animate-fade-in-up`}>
                <SectionHead Icon={CheckCircle2} title="Review Your Order" sub="Last look before payment" />

                <div className="px-5 md:px-7 py-6 flex flex-col gap-6">

                  {/* Address */}
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest m-0 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> Delivering To
                      </h3>
                      <button onClick={() => setStep(1)} className="inline-flex items-center gap-1 text-[11.5px] font-bold text-brand-600 hover:text-brand-700 bg-transparent border-none cursor-pointer p-0 transition-colors">
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                    </div>
                    <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4">
                      <span className="bg-white border border-slate-200 text-slate-600 text-[10.5px] font-bold px-2.5 py-1 rounded-full mb-2.5 inline-flex items-center gap-1.5 uppercase tracking-wider">
                        {shipping.addressType === "Home" ? <Home className="w-3 h-3" /> : shipping.addressType === "Work" ? <Briefcase className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                        {shipping.addressType}
                      </span>
                      <p className="font-bold text-slate-900 text-[14.5px] mb-1 m-0">{shipping.fullName}</p>
                      <p className="text-slate-500 text-[12.5px] mb-2 font-semibold m-0">{shipping.phone}</p>
                      <p className="text-slate-600 text-[13px] leading-relaxed m-0">
                        {shipping.address}{shipping.addressLine2 ? ", " + shipping.addressLine2 : ""}{shipping.landmark ? `, Near: ${shipping.landmark}` : ""}
                        <br />{shipping.city}, {shipping.state} – {shipping.pincode}
                      </p>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest m-0 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" /> Items ({items.length})
                      </h3>
                      {hasDesigns && (
                        <button onClick={() => setStep(2)} className="inline-flex items-center gap-1 text-[11.5px] font-bold text-brand-600 hover:text-brand-700 bg-transparent border-none cursor-pointer p-0 transition-colors">
                          <Pencil className="w-3 h-3" /> Edit designs
                        </button>
                      )}
                    </div>
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {items.map((item) => (
                        <div key={makeCartKey(item._id, item.size)} className="flex items-center gap-3.5 px-4 py-3 bg-white">
                          <img src={item.image || "https://placehold.co/48x48/f5f5f5/999"} alt={item.name}
                            className="w-12 h-12 object-cover rounded-lg bg-slate-50 border border-slate-100 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-slate-800 font-bold text-[13.5px] m-0 leading-tight truncate">{item.name}</p>
                            <p className="text-slate-500 text-[11.5px] font-semibold mt-1 m-0 flex items-center gap-2 flex-wrap">
                              Qty {item.quantity}
                              {item.size && <span className="bg-brand-50 text-brand-700 border border-brand-100 text-[10px] px-1.5 py-0.5 rounded uppercase">{item.size}</span>}
                              {item.uploadedImage && <span className="text-emerald-600 inline-flex items-center gap-1"><Check className="w-3 h-3" /> design attached</span>}
                            </p>
                          </div>
                          <span className="font-black text-slate-900 text-[14px] shrink-0">₹{(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {note && (
                    <div>
                      <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2.5 m-0">Order Note</h3>
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                        <p className="text-amber-800 text-[13px] m-0 italic leading-relaxed">{note}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-5 md:px-7 py-4 border-t border-slate-100 bg-slate-50/60 flex gap-3 justify-between">
                  <button onClick={() => setStep(beforeReview)} className={backBtn}>
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button onClick={() => setStep(4)} className={nextBtn}>
                    Choose Payment <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 4: Payment ── */}
            {step === 4 && (
              <div className={`${cardCls} animate-fade-in-up`}>
                <SectionHead Icon={CreditCard} title="Payment Method" sub="Choose how you'd like to pay" />

                <div className="px-5 md:px-7 py-6">
                  {!codAllowed && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 mb-5 items-start">
                      <AlertTriangle className="w-[18px] h-[18px] text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-amber-800 font-bold text-[13px] mb-1 m-0">Cash on Delivery not available</p>
                        <p className="text-amber-700 text-[13px] m-0">
                          The following customisable item{codBlockedItems.length > 1 ? "s" : ""} require online payment: <strong>{codBlockedItems.map((i) => i.name).join(", ")}</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 mb-5">
                    {[
                      { value: "razorpay", icon: CreditCard, name: "Pay Online", desc: "UPI, Cards, Net Banking & Wallets", tag: "Recommended", available: true },
                      { value: "cod", icon: Banknote, name: "Cash on Delivery", desc: "Pay in cash when your order arrives", tag: null, available: codAllowed },
                    ].filter((opt) => opt.available).map((opt) => {
                      const active = paymentMethod === opt.value;
                      return (
                        <label key={opt.value}
                          className={`flex items-center gap-4 border rounded-xl p-4 cursor-pointer transition-all ${
                            active ? "border-brand-600 bg-brand-50/60 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
                          }`}>
                          <input type="radio" name="payment" value={opt.value} checked={active} onChange={() => setPaymentMethod(opt.value)} className="hidden" />
                          <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${active ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                            <opt.icon className="w-5 h-5" />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-slate-900 text-[14.5px] leading-tight">{opt.name}</span>
                              {opt.tag && (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{opt.tag}</span>
                              )}
                            </span>
                            <span className="block text-slate-500 text-[12.5px] font-semibold mt-1">{opt.desc}</span>
                          </span>
                          <span className={`w-5 h-5 rounded-full border-2 shrink-0 transition-colors flex items-center justify-center ${active ? "border-brand-600 bg-brand-600" : "border-slate-300"}`}>
                            {active && <Check className="w-3 h-3 text-white" />}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {paymentMethod === "razorpay" && (
                    <div className="border border-slate-200 rounded-xl p-4 mb-5 animate-fade-in-up">
                      <p className="text-slate-900 font-bold text-[13px] mb-3 m-0">
                        Quick Pay with UPI <span className="font-medium text-slate-500 text-[11.5px]">(optional)</span>
                      </p>
                      <div className="flex gap-2 mb-3">
                        <input className={inputCls} placeholder="yourname@upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
                        {upiId.trim() && (
                          <button type="button" onClick={() => setUpiId("")}
                            className="bg-slate-100 border-none text-slate-600 hover:text-slate-700 font-bold text-[12.5px] cursor-pointer px-4 rounded-xl transition-colors shrink-0">
                            Clear
                          </button>
                        )}
                      </div>
                      <p className="text-slate-500 text-[11.5px] flex items-center gap-1.5 font-semibold m-0">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" /> Encrypted and processed by Razorpay
                      </p>
                    </div>
                  )}

                  {paymentMethod === "cod" && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3.5 text-emerald-800 text-[13px] mb-5 flex gap-3 animate-fade-in-up">
                      <Banknote className="w-[18px] h-[18px] shrink-0 mt-0.5" />
                      <p className="m-0 leading-relaxed font-medium">Your order will be processed and dispatched. Please keep exact change ready at the time of delivery.</p>
                    </div>
                  )}

                  <div className="py-4 px-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex justify-between text-[13px] text-slate-600 font-semibold mb-1">
                      <span>Product cost</span><span>₹{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[13px] text-slate-600 font-semibold mb-3">
                      <span>Delivery charges</span><span>{!pinEntered ? "Depends on PIN code" : delivery > 0 ?`₹${delivery.toLocaleString()}` : "Free"}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                    <span className="font-black text-slate-900 text-[15px]">Total Payable</span>
                    <span className="text-brand-700 font-black text-[24px] tracking-tight">₹{total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="px-5 md:px-7 py-4 border-t border-slate-100 bg-slate-50/60 flex gap-3 justify-between">
                  <button onClick={() => setStep(3)} className={backBtn}>
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button onClick={handlePayNow} disabled={loading}
                    className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl font-bold text-[13.5px] border-none transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 ${
                      loading ? "opacity-60 cursor-not-allowed transform-none" : "cursor-pointer"
                    }`}>
                    {loading ? (
                      <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing…</>
                    ) : paymentMethod === "razorpay" ? (
                      <><Lock className="w-4 h-4" /> Pay ₹{total.toLocaleString()}</>
                    ) : (
                      <><Package className="w-4 h-4" /> Place COD Order</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Order summary ── */}
          <aside className="w-full lg:w-[340px] shrink-0">
            <div className={cardCls}>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-black text-slate-900 text-[14px] m-0 tracking-tight">Order Summary</h3>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  {items.length} {items.length === 1 ? "item" : "items"}
                </span>
              </div>

              <div className="px-5 py-4 flex flex-col gap-3.5">
                {items.map((item) => (
                  <div key={makeCartKey(item._id, item.size)} className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <img src={item.image || "https://placehold.co/44x44/f5f5f5/999"} alt={item.name}
                        className="w-11 h-11 object-cover rounded-lg bg-slate-50 border border-slate-100" />
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 text-[12.5px] font-bold truncate m-0 leading-tight">{item.name}</p>
                      {item.size && <p className="text-slate-500 text-[11px] font-semibold mt-0.5 m-0">Size {item.size}</p>}
                    </div>
                    <span className="text-slate-900 font-bold text-[12.5px] shrink-0">₹{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="px-5 py-4 border-t border-slate-100 flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 text-[12.5px] font-semibold">Product cost</span>
                  <span className="text-slate-900 font-bold text-[12.5px]">₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 text-[12.5px] font-semibold">Delivery charges</span>
                  {!pinEntered
                    ? <span className="text-slate-600 font-semibold text-[11.5px]">Depends on PIN code</span>
                    : delivery > 0
                    ? <span className="text-slate-900 font-bold text-[12.5px]">₹{delivery.toLocaleString()}</span>
                    : <span className="text-emerald-600 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-wider">Free</span>}
                </div>
                {step >= 4 && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-[12.5px] font-semibold">Payment</span>
                    <span className={`font-bold text-[11px] px-2 py-0.5 rounded border uppercase tracking-wider ${
                      paymentMethod === "razorpay" ? "bg-brand-50 text-brand-700 border-brand-100" : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}>
                      {paymentMethod === "razorpay" ? "Online" : "COD"}
                    </span>
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/70 flex justify-between items-baseline">
                <span className="font-black text-slate-900 text-[14px]">{pinEntered ? "Total" : "Total (excl. delivery)"}</span>
                <span className="text-brand-700 font-black text-[22px] tracking-tight">₹{total.toLocaleString()}</span>
              </div>

              {step >= 2 && shipping.city && (
                <div className="px-5 py-4 border-t border-slate-100">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 m-0">Delivering to</p>
                  <p className="text-slate-900 text-[13px] font-bold m-0">{shipping.fullName}</p>
                  <p className="text-slate-500 text-[11.5px] font-semibold leading-relaxed m-0 mt-0.5">
                    {shipping.city}, {shipping.state} {shipping.pincode}
                  </p>
                </div>
              )}
            </div>

            {/* Trust strip */}
            <ul className="mt-3 flex flex-col gap-2 m-0 p-0 list-none">
              {TRUST.filter(({ text }) => (pinEntered && delivery === 0) || !text.startsWith("Free delivery")).map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-[11.5px] font-semibold text-slate-600 px-2">
                  <Icon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  {text}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
