import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { fetchAllOrders, fetchOrderGroupCounts, updateOrderStatus } from "../../features/orders/orderSlice";
import { markOrderRefunded } from "../../features/payment/paymentSlice";
import { toast } from "react-toastify";
import api from "../../utils/api";
import { downloadFile, openFile } from "../../utils/download";
import {
  ChevronDown, ChevronUp, Eye, MapPin, Phone, Mail, Package,
  Inbox, CheckCircle2, XCircle, FileText, Download,
} from "lucide-react";

const STATUSES = ["Pending", "Processing", "Printing", "Shipped", "Delivered", "Cancelled"];

const STATUS_CFG = {
  Pending:    { cls: "bg-amber-100 text-amber-700",   dot: "bg-amber-400" },
  Processing: { cls: "bg-blue-100 text-blue-700",     dot: "bg-blue-400" },
  Printing:   { cls: "bg-violet-100 text-violet-700", dot: "bg-violet-400" },
  Shipped:    { cls: "bg-sky-100 text-sky-700",       dot: "bg-sky-400" },
  Delivered:  { cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-400" },
  Cancelled:  { cls: "bg-red-100 text-red-600",       dot: "bg-red-400" },
};

const COLLECTION_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi",  label: "UPI" },
  { value: "card", label: "Card" },
];

const DATE_FILTERS = [
  { label: "All",        value: "" },
  { label: "Today",      value: "today" },
  { label: "Last 3 Days",value: "3days" },
  { label: "Last 7 Days",value: "7days" },
  { label: "Last 30 Days",value: "30days" },
  { label: "Custom",     value: "custom" },
];

/* The Orders screen is a work queue, so it opens on the orders that still
   need something done to them. Delivered and cancelled orders are finished
   business — they stay one click away in their own tabs rather than
   burying today's work under months of completed orders. */
const TABS = [
  { value: "active",    label: "Active Orders", icon: Inbox,        hint: "New, processing, printing and shipped" },
  { value: "delivered", label: "Delivered",     icon: CheckCircle2, hint: "Completed orders — download bills here" },
  { value: "cancelled", label: "Cancelled",     icon: XCircle,      hint: "Cancelled by customer or admin" },
];

/* Which statuses the dropdown offers inside each tab. Delivered and
   cancelled orders are terminal, so their tabs get no status control. */
const TAB_STATUSES = {
  active: ["Pending", "Processing", "Printing", "Shipped"],
  delivered: [],
  cancelled: [],
};

/* Admin can raise the bill for any live order — packing happens (and the
   printed bill needs to go in the box) well before a COD payment is
   collected on delivery, so payment settlement is not a precondition here. */
const hasBill = (order) => order.status !== "Cancelled";

/* Reads the payment state in the language of the shop rather than the
   database. A delivered COD order has had its cash collected, so calling
   it "PENDING" — as the raw status once did — was simply wrong. */
const COLLECTION_LABELS = { cash: "Cash", upi: "UPI", card: "Card" };

const paymentLabel = (order) => {
  if (order.paymentStatus === "refunded") return "Refunded";
  if (order.paymentStatus === "failed")   return "Failed";
  if (order.paymentStatus === "paid") {
    if (order.paymentMethod !== "cod") return "Paid";
    const via = COLLECTION_LABELS[order.paymentCollectedVia];
    return via ? `Collected (${via})` : "Collected";
  }
  if (order.status === "Cancelled")       return "Not charged";
  return order.paymentMethod === "cod" ? "Due on delivery" : "Awaiting payment";
};

export default function ManageOrders() {
  const dispatch = useDispatch();
  const { orders, loading, groupCounts } = useSelector((state) => state.orders);

  const [tab, setTab]                   = useState("active");
  const [billBusy, setBillBusy]         = useState(null);
  const [dateFilter, setDateFilter]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate]         = useState("");
  const [toDate, setToDate]             = useState("");
  const [shippingOrderId, setShippingOrderId] = useState(null);
  const [shipForm, setShipForm] = useState({ state: "Maharashtra", length: 10, breadth: 10, height: 5, weight: 0.5 });
  const [refunding, setRefunding] = useState(null);
  const [cancellingShipment, setCancellingShipment] = useState(null);
  const [trackingModal, setTrackingModal] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [collectingOrderId, setCollectingOrderId] = useState(null);
  const [collectionMethod, setCollectionMethod] = useState("cash");
  const [confirmingDelivery, setConfirmingDelivery] = useState(null);

  const loadOrders = () => {
    const params = { group: tab };
    if (dateFilter && dateFilter !== "custom") params.filter = dateFilter;
    if (dateFilter === "custom" && fromDate)   params.from = fromDate;
    if (dateFilter === "custom" && toDate)     params.to   = toDate;
    if (statusFilter)                          params.status = statusFilter;
    dispatch(fetchAllOrders(params));
    dispatch(fetchOrderGroupCounts());
  };

  useEffect(() => { loadOrders(); }, [tab, dateFilter, statusFilter, fromDate, toDate]);

  /* Arriving from a notification (?order=<id>): jump to the tab that holds that
     order, clear filters that could hide it, and open its details. */
  const [searchParams, setSearchParams] = useSearchParams();
  const targetOrderId = searchParams.get("order");
  useEffect(() => {
    if (!targetOrderId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/orders/${targetOrderId}`);
        if (cancelled) return;
        setDateFilter(""); setFromDate(""); setToDate(""); setStatusFilter("");
        setTab(data.status === "Delivered" ? "delivered" : data.status === "Cancelled" ? "cancelled" : "active");
        setExpandedOrderId(data._id);
      } catch {
        if (!cancelled) toast.error("Could not open that order");
      } finally {
        if (!cancelled) setSearchParams({}, { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [targetOrderId]);

  /* Once the list has loaded, bring the opened order into view */
  useEffect(() => {
    if (!expandedOrderId || loading) return;
    document.getElementById(`order-${expandedOrderId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [expandedOrderId, loading, tab]);

  /* A status filter only makes sense within the tab that offers it, so
     switching tabs clears it rather than silently returning nothing. */
  const handleTabChange = (next) => {
    if (next === tab) return;
    setStatusFilter("");
    setExpandedOrderId(null);
    setTab(next);
  };

  const handleStatusChange = async (orderId, status, extra = {}) => {
    const result = await dispatch(updateOrderStatus({ id: orderId, status, ...extra }));
    if (result.error) { toast.error(result.payload || "Failed to update status"); return; }

    if (status === "Delivered") {
      toast.success("Marked as delivered — bill generated and emailed to the customer");
    } else {
      toast.success(`Status updated to "${status}"`);
    }
    // The order has just left this tab, so the list and badges must catch up
    loadOrders();
  };

  /* A COD order isn't settled until the courier actually hands the cash (or a
     UPI/card tap) back to the shop, so marking it Delivered pauses here for
     the admin to say how that happened — rather than assuming cash, or
     leaving the order to look permanently "awaiting payment". */
  const handleStatusSelect = (order, nextStatus) => {
    if (nextStatus === "Delivered" && order.paymentMethod === "cod" && order.paymentStatus === "pending") {
      setCollectionMethod("cash");
      setCollectingOrderId(order._id);
      return;
    }
    handleStatusChange(order._id, nextStatus);
  };

  const handleConfirmPaymentAndDeliver = async (orderId) => {
    setConfirmingDelivery(orderId);
    await handleStatusChange(orderId, "Delivered", { paymentCollectedVia: collectionMethod });
    setConfirmingDelivery(null);
    setCollectingOrderId(null);
  };

  const handleDownloadBill = async (order) => {
    setBillBusy(order._id);
    try {
      await downloadFile(`/invoice/${order._id}`, `Invoice-${order._id.slice(-8).toUpperCase()}.pdf`);
      toast.success("Bill downloaded");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBillBusy(null);
    }
  };

  const handleViewBill = async (order) => {
    setBillBusy(order._id);
    try {
      await openFile(`/invoice/${order._id}/preview`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBillBusy(null);
    }
  };

  const handleRefund = async (orderId) => {
    if (!window.confirm("Mark this order as refunded and cancel it?")) return;
    setRefunding(orderId);
    const result = await dispatch(markOrderRefunded(orderId));
    setRefunding(null);
    if (!result.error) { toast.success("Order marked as refunded"); loadOrders(); }
    else toast.error("Refund failed");
  };

  const handleShipOrder = async (orderId) => {
    try {
      const { data } = await api.post(`/shipment/${orderId}`, shipForm);
      if (data.pickupScheduled) {
        toast.success(`✅ Shipped & pickup scheduled! AWB: ${data.shipment.trackingId || "Pending"}`);
      } else {
        toast.warn(`Order created on Shiprocket but pickup needs manual confirmation. AWB: ${data.shipment.trackingId || "Pending"}`);
      }
      setShippingOrderId(null);
      loadOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Shiprocket error. Check credentials in .env");
    }
  };

  const handleCancelShipment = async (orderId) => {
    if (!window.confirm("Cancel this shipment on Shiprocket? The order will go back to Processing status.")) return;
    setCancellingShipment(orderId);
    try {
      const { data } = await api.post(`/shipment/${orderId}/cancel`);
      toast.success(data.message);
      loadOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel shipment");
    } finally {
      setCancellingShipment(null);
    }
  };

  const handleTrackShipment = async (order) => {
    setTrackingModal(order);
    setTrackingData(null);
    setLoadingTracking(true);
    try {
      const { data } = await api.get(`/shipment/${order._id}`);
      setTrackingData(data);
    } catch {
      toast.error("Failed to fetch tracking info");
      setTrackingModal(null);
    } finally {
      setLoadingTracking(false);
    }
  };

  return (
    <div className="animate-fade-in-up">

      {/* ── Live Tracking Modal ─────────────────────────────── */}
      {trackingModal && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-black text-slate-800 text-base">🚚 Live Shipment Tracking</h2>
                <p className="text-slate-400 text-xs mt-0.5">Order {trackingModal.orderNumber || trackingModal._id.slice(-8).toUpperCase()}</p>
              </div>
              <button onClick={() => { setTrackingModal(null); setTrackingData(null); }}
                className="text-slate-400 hover:text-slate-700 bg-transparent border-none text-xl font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <div className="p-6">
              {loadingTracking ? (
                <div className="flex flex-col items-center py-10 gap-3">
                  <div className="w-10 h-10 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin" />
                  <p className="text-slate-400 text-sm">Fetching live tracking from Shiprocket…</p>
                </div>
              ) : trackingData ? (
                <>
                  {/* Shipment summary */}
                  <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 mb-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Courier</p>
                        <p className="font-bold text-slate-800 text-sm">{trackingData.shipment?.courierName || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">AWB Number</p>
                        <p className="font-mono font-bold text-brand-600 text-sm">{trackingData.shipment?.trackingId || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Shipped On</p>
                        <p className="font-semibold text-slate-700 text-sm">
                          {trackingData.shipment?.shippedAt
                            ? new Date(trackingData.shipment.shippedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Order Status</p>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          STATUS_CFG[trackingData.status]?.cls || "bg-slate-100 text-slate-600"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CFG[trackingData.status]?.dot || "bg-slate-400"}`} />
                          {trackingData.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Live tracking events from Shiprocket */}
                  {trackingData.liveTracking ? (
                    <>
                      {/* Current status highlight */}
                      {trackingData.liveTracking.shipment_track?.[0] && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Current Status</p>
                          <p className="font-bold text-emerald-800 text-sm">
                            {trackingData.liveTracking.shipment_track[0].current_status || "In Transit"}
                          </p>
                          {trackingData.liveTracking.shipment_track[0].delivered_date && (
                            <p className="text-emerald-600 text-xs mt-1">
                              Delivered: {trackingData.liveTracking.shipment_track[0].delivered_date}
                            </p>
                          )}
                          {trackingData.liveTracking.shipment_track[0].etd && (
                            <p className="text-emerald-600 text-xs mt-1">
                              Expected Delivery: {trackingData.liveTracking.shipment_track[0].etd}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Tracking activity timeline */}
                      {trackingData.liveTracking.shipment_track_activities?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Tracking Timeline</p>
                          <div className="flex flex-col gap-0 relative">
                            {/* Vertical line */}
                            <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-slate-200" />
                            {trackingData.liveTracking.shipment_track_activities.map((activity, i) => (
                              <div key={i} className="flex gap-3 pb-4 relative">
                                <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center z-10 mt-0.5 ${
                                  i === 0 ? "bg-brand-600" : "bg-slate-200"
                                }`}>
                                  <span className={`text-[9px] font-bold ${
                                    i === 0 ? "text-white" : "text-slate-500"
                                  }`}>{i === 0 ? "●" : "○"}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-semibold ${
                                    i === 0 ? "text-brand-700" : "text-slate-700"
                                  }`}>
                                    {activity["sr-status-label"] || activity.activity || "Update"}
                                  </p>
                                  {activity.location && (
                                    <p className="text-xs text-slate-500 mt-0.5">📍 {activity.location}</p>
                                  )}
                                  {activity.date && (
                                    <p className="text-xs text-slate-400 mt-0.5">🕐 {activity.date}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    /* No live data yet — show pickup status info */
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="font-bold text-amber-700 text-sm mb-2">⏳ Pickup Pending</p>
                      <p className="text-amber-600 text-xs leading-relaxed">
                        The shipment has been created and pickup is scheduled. Live tracking will be available once the courier partner scans the parcel at pickup.
                      </p>
                      <div className="mt-3 flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">✓</span>
                          <span className="text-xs text-slate-600 font-medium">Order created on Shiprocket</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">✓</span>
                          <span className="text-xs text-slate-600 font-medium">AWB assigned — {trackingData.shipment?.courierName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">✓</span>
                          <span className="text-xs text-slate-600 font-medium">Pickup scheduled</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-[9px] font-bold shrink-0">○</span>
                          <span className="text-xs text-slate-400">Waiting for courier to collect parcel…</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-[9px] font-bold shrink-0">○</span>
                          <span className="text-xs text-slate-400">In transit</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-[9px] font-bold shrink-0">○</span>
                          <span className="text-xs text-slate-400">Delivered to customer</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* External track link */}
                  {trackingData.shipment?.trackingId && (
                    <a
                      href={`https://shiprocket.co/tracking/${trackingData.shipment.trackingId}`}
                      target="_blank" rel="noreferrer"
                      className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold transition-colors"
                    >
                      🔗 Open Full Tracking on Shiprocket ↗
                    </a>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            {TABS.find((t) => t.value === tab)?.label}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {orders.length} {orders.length === 1 ? "order" : "orders"} · {TABS.find((t) => t.value === tab)?.hint}
          </p>
        </div>
        <button onClick={loadOrders} className="admin-btn admin-btn-ghost text-xs">
          ↻ Refresh
        </button>
      </div>

      {/* Tabs — the working queue, then the two finished piles */}
      <div className="flex flex-wrap gap-2 mb-5 border-b border-slate-200">
        {TABS.map(({ value, label, icon: Icon }) => {
          const active = tab === value;
          const count = groupCounts?.[value] ?? 0;
          return (
            <button
              key={value}
              onClick={() => handleTabChange(value)}
              className={`relative flex items-center gap-2 px-4 py-2.5 -mb-px text-[13px] font-bold border-b-2 transition-colors ${
                active
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              <Icon size={15} strokeWidth={active ? 2.4 : 1.9} />
              {label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none min-w-[20px] ${
                active ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-400"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="admin-card p-4 mb-5">
        {/* Date pill filters */}
        <div className="flex flex-wrap gap-2 mb-3">
          {DATE_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setDateFilter(value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                dateFilter === value
                  ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                  : "bg-white text-slate-500 border-slate-200 hover:border-brand-300 hover:text-brand-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        {dateFilter === "custom" && (
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <input type="date" className="admin-input !w-auto" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <span className="text-slate-400 text-sm font-medium">→</span>
            <input type="date" className="admin-input !w-auto" value={toDate}   onChange={(e) => setToDate(e.target.value)} />
          </div>
        )}

        {/* Status filter — only where the tab has more than one status */}
        {TAB_STATUSES[tab].length > 0 && (
          <select
            className="admin-input !w-auto"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Active Statuses</option>
            {TAB_STATUSES[tab].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
            <div className="absolute inset-0 rounded-full border-4 border-t-brand-600 animate-spin" />
          </div>
        </div>
      ) : orders.length === 0 ? (
        <div className="admin-card p-16 text-center">
          <p className="text-4xl mb-3">{tab === "active" ? "✅" : tab === "delivered" ? "📦" : "🎉"}</p>
          <p className="text-slate-500 font-medium">
            {tab === "active"    && "No orders waiting — the queue is clear."}
            {tab === "delivered" && "No delivered orders in this period yet."}
            {tab === "cancelled" && "No cancelled orders. Good news."}
          </p>
          <p className="text-slate-400 text-xs mt-1.5">
            {tab === "active"
              ? "New orders land here the moment a customer checks out."
              : "Try widening the date filter above."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => {
            const cfg = STATUS_CFG[order.status] || { cls: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
            const isExpanded = expandedOrderId === order._id;
            const itemCount = order.items.reduce((sum, it) => sum + it.quantity, 0);
            return (
              <div key={order._id} id={`order-${order._id}`} className="admin-card scroll-mt-24 hover:shadow-card-hover transition-shadow duration-200 overflow-hidden">
                {/* ── Compact row — always visible ─────────────────── */}
                <div
                  onClick={() => setExpandedOrderId(isExpanded ? null : order._id)}
                  className={`cursor-pointer transition-colors ${isExpanded ? "bg-brand-50/40" : "hover:bg-slate-50"}`}
                >
                  <div className="grid grid-cols-12 gap-3 items-center px-4 py-3">
                    {/* Status dot + Order ID */}
                    <div className="col-span-12 sm:col-span-2 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0`} />
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 font-medium leading-none mb-0.5">Order</p>
                        <p className="font-mono text-xs text-slate-700 font-bold truncate">
                          {order.orderNumber || order._id.slice(-8).toUpperCase()}
                        </p>
                      </div>
                    </div>

                    {/* Customer */}
                    <div className="col-span-7 sm:col-span-3 min-w-0">
                      <p className="text-[10px] text-slate-400 font-medium leading-none mb-0.5">Customer</p>
                      <p className="text-sm font-semibold text-slate-800 truncate">{order.user?.name || order.shippingAddress?.fullName}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {order.shippingAddress?.city}{order.shippingAddress?.state ? `, ${order.shippingAddress.state}` : ""}
                      </p>
                    </div>

                    {/* Items */}
                    <div className="hidden sm:block sm:col-span-1">
                      <p className="text-[10px] text-slate-400 font-medium leading-none mb-0.5">Items</p>
                      <p className="text-sm font-bold text-slate-700">{itemCount}</p>
                    </div>

                    {/* Total */}
                    <div className="col-span-5 sm:col-span-2">
                      <p className="text-[10px] text-slate-400 font-medium leading-none mb-0.5">Total</p>
                      <p className="text-sm font-black text-slate-900">₹{order.totalPrice.toLocaleString()}</p>
                    </div>

                    {/* Payment + Status badges */}
                    <div className="col-span-12 sm:col-span-3 flex items-center flex-wrap gap-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        order.paymentStatus === "paid"     ? "bg-emerald-100 text-emerald-700" :
                        order.paymentStatus === "refunded" ? "bg-red-100 text-red-600"         :
                                                             "bg-amber-100 text-amber-700"
                      }`}>
                        {order.paymentMethod === "razorpay" ? "💳" : "💵"} {paymentLabel(order)}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.cls}`}>
                        {order.status}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-auto sm:ml-0">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                      </span>
                    </div>

                    {/* Row actions */}
                    <div className="col-span-12 sm:col-span-1 flex justify-end gap-1.5">
                      {/* Straight to the bill — available from the moment
                          the order is placed, so packing doesn't need a
                          click into the details panel first to print it. */}
                      {hasBill(order) && (
                        <button
                          title="Download tax invoice"
                          disabled={billBusy === order._id}
                          onClick={(e) => { e.stopPropagation(); handleDownloadBill(order); }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 transition-all disabled:opacity-50"
                        >
                          <Download size={12} />
                          <span className="hidden xl:inline">Bill</span>
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedOrderId(isExpanded ? null : order._id); }}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          isExpanded
                            ? "bg-brand-600 text-white border-brand-600"
                            : "bg-white text-brand-600 border-brand-200 hover:bg-brand-50"
                        }`}
                      >
                        <Eye size={12} />
                        {isExpanded ? "Hide" : "View"}
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Expanded details ─────────────────────────────── */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-5 bg-white animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Full Order ID strip */}
                    <div className="flex justify-between flex-wrap gap-2 mb-4 pb-3 border-b border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Full Order ID</p>
                        <p className="font-mono text-sm text-slate-700 font-semibold">{order._id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Placed On</p>
                        <p className="text-sm text-slate-700 font-semibold">
                          {new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>
                    </div>

                  {/* Customer info */}
                  <div className="p-3 bg-slate-50 rounded-xl mb-4">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-9 h-9 shrink-0 rounded-xl bg-brand-50 border border-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
                        {order.user?.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">{order.user?.name}</p>
                        <p className="text-xs text-slate-500 truncate flex items-center gap-1"><Mail size={11} /> {order.user?.email}</p>
                        {order.user?.phone && <p className="text-xs text-slate-400 flex items-center gap-1"><Phone size={11} /> {order.user.phone}</p>}
                      </div>
                    </div>
                    <div className="border-t border-slate-200 pt-2 mt-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <MapPin size={11} /> Shipping Address
                        {order.shippingAddress?.addressType && (
                          <span className="ml-2 normal-case bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                            {order.shippingAddress.addressType}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-700 font-semibold">{order.shippingAddress?.fullName}</p>
                      <p className="text-xs text-slate-500">📞 {order.shippingAddress?.phone}</p>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        {order.shippingAddress?.address}
                        {order.shippingAddress?.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ""}
                        {order.shippingAddress?.landmark ? ` (Near: ${order.shippingAddress.landmark})` : ""}
                      </p>
                      <p className="text-xs text-slate-600">
                        {order.shippingAddress?.city}
                        {order.shippingAddress?.state ? `, ${order.shippingAddress.state}` : ""} — {order.shippingAddress?.pincode}
                      </p>
                    </div>
                  </div>

                  {/* Payment badge */}
                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    <span className={`status-badge ${
                      order.paymentStatus === "paid"     ? "bg-emerald-100 text-emerald-700" :
                      order.paymentStatus === "refunded" ? "bg-red-100 text-red-600"         :
                                                           "bg-amber-100 text-amber-700"
                    }`}>
                      {order.paymentMethod === "razorpay" ? "💳 Razorpay" : "💵 COD"}
                      {" · "}{paymentLabel(order)}
                    </span>
                    {order.razorpayPaymentId && (
                      <span className="text-xs text-slate-400 font-mono">
                        ID: <span className="text-brand-500">{order.razorpayPaymentId}</span>
                      </span>
                    )}
                    {order.invoice?.number && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                        <FileText size={11} /> Bill {order.invoice.number}
                      </span>
                    )}
                  </div>

                  {/* Bill — available on any order that hasn't been
                      cancelled, so it can be printed and packed with the
                      order before payment is settled (e.g. COD). */}
                  {hasBill(order) && (
                    <div className="flex items-center gap-3 flex-wrap bg-emerald-50/70 border border-emerald-100 rounded-xl px-4 py-3 mb-4">
                      <FileText size={16} className="text-emerald-700 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-emerald-900 m-0">Tax invoice ready</p>
                        <p className="text-[11.5px] text-emerald-700/80 m-0 mt-0.5">
                          GST bill for ₹{order.totalPrice.toLocaleString("en-IN")}
                          {order.invoice?.number ? ` · ${order.invoice.number}` : " · number assigned on first download"}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          disabled={billBusy === order._id}
                          onClick={() => handleViewBill(order)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-white border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50"
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          disabled={billBusy === order._id}
                          onClick={() => handleDownloadBill(order)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 border-none px-3 py-1.5 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <Download size={12} />
                          {billBusy === order._id ? "Preparing…" : "Download Bill"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Items */}
                  <div className="border-t border-slate-100 pt-3 flex flex-col gap-2 mb-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Package size={11} /> Items ({order.items.length})
                    </p>
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center flex-wrap gap-2">
                        {item.product?.image && (
                          <img src={item.product.image} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-100 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2 flex-wrap">
                            {item.name}
                            {item.size && (
                              <span className="bg-brand-50 text-brand-700 border border-brand-100 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Size: {item.size}
                              </span>
                            )}
                          </p>
                          {item.product ? (
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {[
                                item.product.category && `Category: ${item.product.category}`,
                                item.product.subcategory && `Sub: ${item.product.subcategory}`,
                                item.product.brand && `Brand: ${item.product.brand}`,
                                item.product.sku && `SKU: ${item.product.sku}`,
                              ].filter(Boolean).join(" · ")}
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-400 mt-0.5">Product no longer in catalogue</p>
                          )}
                          <p className="text-xs text-slate-400">
                            Qty: {item.quantity} × ₹{item.price} = <span className="font-semibold text-slate-600">₹{(item.quantity * item.price).toLocaleString("en-IN")}</span>
                          </p>
                        </div>
                        {item.uploadedImage ? (
                          <a
                            href={item.uploadedImage} target="_blank" rel="noreferrer"
                            className="text-xs border border-emerald-200 text-emerald-600 px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition-colors font-medium"
                          >
                            View Design ↗
                          </a>
                        ) : (
                          <span className="text-xs text-slate-300">No custom image</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {order.customerNote && (
                    <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 mb-3">
                      <span className="mt-0.5">📝</span>
                      <span>{order.customerNote}</span>
                    </div>
                  )}

                  {order.shipment?.trackingId && (
                    <div className="flex items-start gap-2 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2.5 text-sm text-sky-700 mb-3">
                      <span>🚚</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{order.shipment.courierName || "Courier Assigned"}</p>
                        <p className="text-xs mt-0.5">AWB: <code className="font-mono">{order.shipment.trackingId}</code></p>
                        {order.shipment.shippedAt && (
                          <p className="text-xs text-sky-400 mt-0.5">
                            Shipped: {new Date(order.shipment.shippedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        {/* Live Track button */}
                        <button
                          onClick={() => handleTrackShipment(order)}
                          className="text-xs bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1 rounded-lg font-semibold transition-colors border-none cursor-pointer"
                        >
                          📍 Track Live
                        </button>
                        {/* Cancel shipment — only before delivery */}
                        {order.status === "Shipped" && (
                          <button
                            disabled={cancellingShipment === order._id}
                            onClick={() => handleCancelShipment(order._id)}
                            className="text-xs text-brand-500 border border-brand-200 px-2.5 py-1 rounded-lg hover:bg-brand-50 transition-colors font-semibold shrink-0 disabled:opacity-50"
                          >
                            {cancellingShipment === order._id ? "Cancelling…" : "Cancel"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bottom action row */}
                  <div className="flex flex-wrap gap-3 items-start pt-3 border-t border-slate-100">
                    {/* Status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`status-badge ${cfg.cls} flex items-center gap-1.5`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {order.status}
                      </span>

                      {/* If cancelled by user — show locked badge, no dropdown */}
                      {order.cancelledBy === "user" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 text-xs font-semibold">
                          🔒 Cancelled by Customer — Cannot Edit
                        </span>
                      ) : order.status === "Cancelled" ? (
                        // Admin-cancelled — also locked (no point re-editing)
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs font-semibold">
                          🔒 Cancelled by Admin
                        </span>
                      ) : order.status === "Delivered" ? (
                        /* Delivery raises a numbered GST invoice. Walking the
                           status backwards would leave that bill describing a
                           sale that no longer exists, so it stops here. */
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                          🔒 Delivered &amp; billed — final
                        </span>
                      ) : (
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusSelect(order, e.target.value)}
                          className="admin-input !w-auto !py-1.5 !text-xs"
                        >
                          {STATUSES.filter((s) => s !== "Cancelled").map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Collect COD payment — shown only after the admin picks
                        "Delivered" on a COD order that hasn't been paid yet. */}
                    {collectingOrderId === order._id && (
                      <div className="bg-white border-2 border-emerald-200 rounded-xl p-4 w-full mt-1 shadow-sm">
                        <p className="text-sm font-black text-emerald-800 mb-3 flex items-center gap-1.5">
                          💵 How was the ₹{order.totalPrice.toLocaleString()} payment collected?
                        </p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {COLLECTION_METHODS.map(({ value, label }) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setCollectionMethod(value)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                                collectionMethod === value
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                  : "bg-white text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            disabled={confirmingDelivery === order._id}
                            onClick={() => handleConfirmPaymentAndDeliver(order._id)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-2.5 px-4 rounded-xl border-none cursor-pointer transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {confirmingDelivery === order._id
                              ? "Confirming…"
                              : `✅ Cash Received — Mark Delivered`}
                          </button>
                          <button
                            onClick={() => setCollectingOrderId(null)}
                            className="bg-white border-2 border-slate-200 text-slate-600 font-bold text-sm py-2.5 px-5 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Refund */}
                    {order.paymentMethod === "razorpay" && order.paymentStatus === "paid" && order.status !== "Cancelled" && (
                      <button
                        disabled={refunding === order._id}
                        onClick={() => handleRefund(order._id)}
                        className="admin-btn admin-btn-danger !py-1.5 !text-xs disabled:opacity-50"
                      >
                        {refunding === order._id ? "Processing…" : "↩ Mark Refunded"}
                      </button>
                    )}

                    {/* Shiprocket */}
                    {!order.shipment?.trackingId && !["Cancelled", "Delivered"].includes(order.status) && (
                      shippingOrderId === order._id ? (
                        <div className="bg-white border-2 border-brand-200 rounded-xl p-4 w-full mt-1 shadow-sm">
                          <p className="text-sm font-black text-brand-700 mb-3 flex items-center gap-1.5">
                            📦 Confirm Shipment via Shiprocket
                          </p>

                          {/* Customer details summary — admin sees exactly what's being sent */}
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
                            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              ✅ Customer Details — Will Be Sent to Shiprocket
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                              <div className="flex gap-1.5">
                                <span className="text-slate-500 font-semibold shrink-0 w-14">Name:</span>
                                <span className="text-slate-800 font-bold">{order.shippingAddress?.fullName || "—"}</span>
                              </div>
                              <div className="flex gap-1.5">
                                <span className="text-slate-500 font-semibold shrink-0 w-14">Phone:</span>
                                <span className="text-slate-800 font-bold">{order.shippingAddress?.phone || "—"}</span>
                              </div>
                              <div className="flex gap-1.5">
                                <span className="text-slate-500 font-semibold shrink-0 w-14">Email:</span>
                                <span className="text-slate-800 font-bold truncate">{order.user?.email || "—"}</span>
                              </div>
                              {order.user?.phone && order.user.phone !== order.shippingAddress?.phone && (
                                <div className="flex gap-1.5">
                                  <span className="text-slate-500 font-semibold shrink-0 w-14">Alt Phone:</span>
                                  <span className="text-slate-800 font-bold">{order.user.phone}</span>
                                </div>
                              )}
                              <div className="flex gap-1.5 sm:col-span-2">
                                <span className="text-slate-500 font-semibold shrink-0 w-14">Address:</span>
                                <span className="text-slate-800">
                                  {order.shippingAddress?.address}
                                  {order.shippingAddress?.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ""}
                                  {order.shippingAddress?.landmark ? ` (Landmark: ${order.shippingAddress.landmark})` : ""}
                                </span>
                              </div>
                              <div className="flex gap-1.5 sm:col-span-2">
                                <span className="text-slate-500 font-semibold shrink-0 w-14">Area:</span>
                                <span className="text-slate-800 font-bold">
                                  {order.shippingAddress?.city}
                                  {order.shippingAddress?.state ? `, ${order.shippingAddress.state}` : ""}
                                  {" — "}{order.shippingAddress?.pincode}
                                </span>
                              </div>
                              <div className="flex gap-1.5">
                                <span className="text-slate-500 font-semibold shrink-0 w-14">Payment:</span>
                                <span className={`font-bold ${order.paymentStatus === "paid" ? "text-emerald-700" : "text-amber-700"}`}>
                                  {order.paymentMethod === "razorpay" && order.paymentStatus === "paid"
                                    ? "Prepaid ✓"
                                    : `COD — Collect ₹${order.totalPrice.toLocaleString()}`}
                                </span>
                              </div>
                              <div className="flex gap-1.5">
                                <span className="text-slate-500 font-semibold shrink-0 w-14">Items:</span>
                                <span className="text-slate-800 font-bold">{order.items.length} item(s)</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-[11px] text-amber-700 leading-relaxed">
                            ⚠️ <strong>Pickup address:</strong> The delivery boy will collect the parcel from your <strong>Shiprocket Pickup Address</strong> (configured at Shiprocket → Settings → Manage Pickup Addresses).
                          </div>

                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">📐 Package Dimensions</p>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Length (cm) *</label>
                              <input type="number" placeholder="10" value={shipForm.length}
                                onChange={(e) => setShipForm({ ...shipForm, length: e.target.value })}
                                className="admin-input !py-1.5 !text-xs" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Breadth (cm) *</label>
                              <input type="number" placeholder="10" value={shipForm.breadth}
                                onChange={(e) => setShipForm({ ...shipForm, breadth: e.target.value })}
                                className="admin-input !py-1.5 !text-xs" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Height (cm) *</label>
                              <input type="number" placeholder="5" value={shipForm.height}
                                onChange={(e) => setShipForm({ ...shipForm, height: e.target.value })}
                                className="admin-input !py-1.5 !text-xs" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Weight (kg) *</label>
                              <input type="number" step="0.1" placeholder="0.5" value={shipForm.weight}
                                onChange={(e) => setShipForm({ ...shipForm, weight: e.target.value })}
                                className="admin-input !py-1.5 !text-xs" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Pickup State</label>
                              <input type="text" placeholder="Maharashtra" value={shipForm.state}
                                onChange={(e) => setShipForm({ ...shipForm, state: e.target.value })}
                                className="admin-input !py-1.5 !text-xs" />
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2">
                            <button
                              onClick={() => handleShipOrder(order._id)}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-3 px-4 rounded-xl border-none cursor-pointer transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                            >
                              🚚 Confirm & Ship Now — Schedule Pickup
                            </button>
                            <button
                              onClick={() => setShippingOrderId(null)}
                              className="bg-white border-2 border-slate-200 text-slate-600 font-bold text-sm py-3 px-5 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-2 text-center font-medium">
                            On confirm: Shiprocket order created → AWB assigned → delivery boy pickup scheduled → customer notified by email.
                          </p>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShippingOrderId(order._id)}
                          className="admin-btn bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 !py-1.5 !text-xs"
                        >
                          🚚 Ship via Shiprocket
                        </button>
                      )
                    )}
                  </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
