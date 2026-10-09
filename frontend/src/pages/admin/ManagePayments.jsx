import { confirmDialog } from "../../components/ConfirmDialog";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllPayments, fetchPaymentStats, markOrderRefunded } from "../../features/payment/paymentSlice";
import { toast } from "react-toastify";
import { downloadFile, openFile } from "../../utils/download";
import {
  CreditCard, Banknote, IndianRupee, Search, RefreshCw, Filter,
  XCircle, Copy, Hash, Calendar,
  FileText, Download, Eye, Undo2,
} from "lucide-react";

const METHOD_FILTERS = [
  { label: "All",     value: "" },
  { label: "Online",  value: "razorpay" },
  { label: "COD",     value: "cod" },
];

const DATE_FILTERS = [
  { label: "All Time",      value: "" },
  { label: "Today",         value: "today" },
  { label: "Last 3 Days",   value: "3d" },
  { label: "Last 7 Days",   value: "7d" },
  { label: "Last 30 Days",  value: "30d" },
];

const DATE_FILTER_DAYS = { today: 0, "3d": 2, "7d": 6, "30d": 29 };

const toISODate = (d) => d.toISOString().slice(0, 10);

// Presets just populate the From/To inputs, which are the single source of truth for the query.
const resolveDateRange = (preset) => {
  if (!preset) return { from: "", to: "" };
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (DATE_FILTER_DAYS[preset] ?? 0));
  return { from: toISODate(from), to: toISODate(to) };
};

// Only "paid" payments are ever listed here, so the badge has a single look.
const PAID_BADGE = { cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };

export default function ManagePayments() {
  const dispatch = useDispatch();
  const { payments, stats, loading } = useSelector((s) => s.payment);

  const [method, setMethod] = useState("");
  const [search, setSearch] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [refunding, setRefunding] = useState(null);
  const [billBusy, setBillBusy] = useState(null);

  // Which quick-preset (if any) matches the current From/To inputs, for highlighting the active pill.
  const activePreset = useMemo(() => {
    return DATE_FILTERS.find(({ value }) => {
      const range = resolveDateRange(value);
      return range.from === customFrom && range.to === customTo;
    })?.value ?? null;
  }, [customFrom, customTo]);

  const applyDatePreset = (preset) => {
    const range = resolveDateRange(preset);
    setCustomFrom(range.from);
    setCustomTo(range.to);
  };

  const load = () => {
    // Only successful payments belong on this screen.
    const params = { status: "paid" };
    if (method) params.method = method;
    if (customFrom) params.from = customFrom;
    if (customTo) params.to = customTo;
    dispatch(fetchAllPayments(params));
  };

  useEffect(() => { load(); dispatch(fetchPaymentStats()); }, [method, customFrom, customTo]);

  const handleCopy = (text, label = "Copied") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const handleRefund = async (orderId) => {
    if (!(await confirmDialog("Mark this payment as refunded? The order will also be cancelled."))) return;
    setRefunding(orderId);
    const result = await dispatch(markOrderRefunded(orderId));
    setRefunding(null);
    if (!result.error) {
      toast.success("Marked as refunded");
      load();
      dispatch(fetchPaymentStats());
    } else {
      toast.error("Refund failed");
    }
  };

  /* A payment row and a bill describe the same transaction, so the bill is
     reachable from here rather than only from the Orders screen — this is
     where an admin ends up when a customer asks for their invoice. */
  const handleBill = async (payment, mode) => {
    setBillBusy(payment._id);
    try {
      if (mode === "view") {
        await openFile(`/invoice/${payment._id}/preview`);
      } else {
        await downloadFile(`/invoice/${payment._id}`, `Invoice-${payment._id.slice(-8).toUpperCase()}.pdf`);
        toast.success("Bill downloaded");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBillBusy(null);
    }
  };

  // Client-side search across customer name / email / payment id / order id
  const filtered = useMemo(() => {
    if (!search.trim()) return payments;
    const q = search.trim().toLowerCase();
    return payments.filter((p) =>
      (p.user?.name || "").toLowerCase().includes(q) ||
      (p.user?.email || "").toLowerCase().includes(q) ||
      (p.user?.phone || "").toLowerCase().includes(q) ||
      (p.razorpayPaymentId || "").toLowerCase().includes(q) ||
      (p.razorpayOrderId || "").toLowerCase().includes(q) ||
      (p._id || "").toLowerCase().includes(q)
    );
  }, [payments, search]);

  const totals = useMemo(() => {
    const acc = { paid: 0, refunded: 0, pending: 0, count: filtered.length };
    filtered.forEach((p) => {
      if (p.paymentStatus === "paid") acc.paid += p.totalPrice;
      else if (p.paymentStatus === "refunded") acc.refunded += p.totalPrice;
      else acc.pending += p.totalPrice;
    });
    return acc;
  }, [filtered]);

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-brand-600" /> Payments
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">{filtered.length} {filtered.length === 1 ? "payment" : "payments"} found</p>
        </div>
        <button onClick={load} className="admin-btn admin-btn-ghost text-xs flex items-center gap-1.5">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="admin-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Online Revenue</p>
            <CreditCard className="w-4 h-4 text-brand-500" />
          </div>
          <p className="text-xl font-black text-slate-900">₹{(stats?.razorpay?.total || 0).toLocaleString("en-IN")}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">{stats?.razorpay?.count || 0} paid orders</p>
        </div>
        <div className="admin-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">COD Revenue</p>
            <Banknote className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-black text-slate-900">₹{(stats?.cod?.total || 0).toLocaleString("en-IN")}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">{stats?.cod?.count || 0} COD orders</p>
        </div>
        <div className="admin-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Refunded</p>
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-xl font-black text-slate-900">₹{(stats?.refunded?.total || 0).toLocaleString("en-IN")}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">{stats?.refunded?.count || 0} refunds</p>
        </div>
        <div className="admin-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Showing</p>
            <IndianRupee className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-black text-slate-900">₹{totals.paid.toLocaleString("en-IN")}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">across {totals.count} rows</p>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-card p-4 mb-5">
        <div className="flex items-center gap-2 mb-3 text-slate-500 text-[11px] font-bold uppercase tracking-widest">
          <Filter size={12} /> Filters
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          {/* Method */}
          <div className="flex items-center gap-1.5">
            {METHOD_FILTERS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setMethod(value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 whitespace-nowrap ${
                  method === value
                    ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                    : "bg-white text-slate-500 border-slate-200 hover:border-brand-300 hover:text-brand-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="hidden sm:block h-6 w-px bg-slate-200" />

          {/* Date presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {DATE_FILTERS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => applyDatePreset(value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 whitespace-nowrap ${
                  activePreset === value
                    ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="hidden sm:block h-6 w-px bg-slate-200" />

          {/* Custom date range */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">From</label>
            <input
              type="date"
              className="admin-input !w-auto !py-1.5 text-xs"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">To</label>
            <input
              type="date"
              className="admin-input !w-auto !py-1.5 text-xs"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => setCustomTo(e.target.value)}
            />
            {(customFrom || customTo) && (
              <button
                onClick={() => { setCustomFrom(""); setCustomTo(""); }}
                className="text-[11px] font-semibold text-slate-400 hover:text-brand-600 transition-colors whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer, email, payment ID, order ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-input !pl-9 !py-1.5 text-xs"
            />
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
            <div className="absolute inset-0 rounded-full border-4 border-t-brand-600 animate-spin" />
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-card p-16 text-center">
          <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No payments found for this filter.</p>
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50">
                  {["No.", "Customer", "Payment / Order", "Amount", "Method", "Date", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap border-b border-slate-200">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const isOnline = p.paymentMethod === "razorpay";
                  const billable = p.paymentStatus === "paid" && p.status !== "Cancelled";
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                      {/* # */}
                      <td className="px-3 py-3.5 whitespace-nowrap text-slate-400 font-medium border-b border-slate-100">
                        {i + 1}
                      </td>

                      {/* Customer */}
                      <td className="px-3 py-3.5 max-w-[180px] border-b border-slate-100">
                        <p className="font-semibold text-slate-800 truncate">{p.user?.name || "Unknown"}</p>
                        <p className="text-slate-400 truncate">{p.user?.email || p.user?.phone || "—"}</p>
                      </td>

                      {/* Payment / Order IDs */}
                      <td className="px-3 py-3.5 border-b border-slate-100">
                        <div className="flex items-center gap-1 text-slate-500">
                          <Hash size={10} className="shrink-0" />
                          {isOnline && p.razorpayPaymentId ? (
                            <>
                              <code className="font-mono truncate max-w-[110px]" title={p.razorpayPaymentId}>{p.razorpayPaymentId}</code>
                              <button
                                onClick={() => handleCopy(p.razorpayPaymentId, "Payment ID")}
                                className="text-slate-300 hover:text-brand-600 transition-colors shrink-0"
                                title="Copy Payment ID"
                              >
                                <Copy size={10} />
                              </button>
                            </>
                          ) : (
                            <span className="font-mono text-slate-400">{p.orderNumber || p._id.slice(-8).toUpperCase()}</span>
                          )}
                        </div>
                        {p.invoice?.number && (
                          <div className="flex items-center gap-1 text-emerald-600 mt-0.5">
                            <FileText size={10} className="shrink-0" />
                            <span className="font-mono">{p.invoice.number}</span>
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-3 py-3.5 whitespace-nowrap border-b border-slate-100">
                        <span className="font-black text-slate-900">₹{p.totalPrice.toLocaleString("en-IN")}</span>
                      </td>

                      {/* Method */}
                      <td className="px-3 py-3.5 whitespace-nowrap border-b border-slate-100">
                        <span className={`inline-flex items-center gap-1.5 font-semibold ${isOnline ? "text-brand-600" : "text-emerald-600"}`}>
                          {isOnline ? <CreditCard size={13} /> : <Banknote size={13} />}
                          {isOnline ? "Razorpay" : "COD"}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-3 py-3.5 whitespace-nowrap text-slate-400 border-b border-slate-100">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(p.paidAt || p.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3.5 whitespace-nowrap border-b border-slate-100">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${PAID_BADGE.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${PAID_BADGE.dot}`} />
                          PAID
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3.5 whitespace-nowrap border-b border-slate-100">
                        <div className="flex items-center gap-1.5">
                          {billable && (
                            <>
                              <button
                                disabled={billBusy === p._id}
                                onClick={() => handleBill(p, "view")}
                                title="Open the tax invoice"
                                className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg disabled:opacity-50 transition-colors"
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                disabled={billBusy === p._id}
                                onClick={() => handleBill(p, "download")}
                                title="Download the tax invoice"
                                className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg disabled:opacity-50 transition-colors"
                              >
                                <Download size={13} />
                              </button>
                            </>
                          )}
                          {isOnline && p.paymentStatus === "paid" && p.status !== "Cancelled" && (
                            <button
                              disabled={refunding === p._id}
                              onClick={() => handleRefund(p._id)}
                              title="Mark refunded"
                              className="text-brand-600 hover:bg-brand-50 p-1.5 rounded-lg disabled:opacity-50 transition-colors"
                            >
                              <Undo2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-400">
            Showing {filtered.length} of {payments.length} payments
          </div>
        </div>
      )}
    </div>
  );
}
