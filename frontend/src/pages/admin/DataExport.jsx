import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  FileSpreadsheet, FileText, Users, Package, ShoppingCart,
  Download, Check, ShieldCheck, Clock, Loader2,
  CreditCard, Star, MessageSquare, RefreshCcw, Tag, Megaphone,
} from "lucide-react";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const DATE_RANGES = [
  { label: "All Time",     value: "" },
  { label: "Today",        value: "today" },
  { label: "Last 7 Days",  value: "7days" },
  { label: "Last 30 Days", value: "30days" },
  { label: "Custom",       value: "custom" },
];

/* Option helper — "all" is always first and is never sent to the server. */
const opts = (...values) => [
  { value: "all", label: "All" },
  ...values.map((v) => (typeof v === "string" ? { value: v, label: v } : v)),
];

/* Every dataset the admin can export. `filters` drives the extra pill rows
   in step 3 — each one maps to a query param the export API understands. */
const EXPORT_TYPES = [
  {
    key: "orders", label: "Orders", desc: "Records, payments & tracking", Icon: ShoppingCart,
    filters: [{ param: "status", label: "Order Status",
      options: opts("Pending", "Processing", "Printing", "Ready for Delivery", "Shipped", "Delivered", "Cancelled") }],
  },
  {
    key: "payments", label: "Payments", desc: "Transactions & refunds", Icon: CreditCard,
    filters: [
      { param: "status", label: "Payment Status",
        options: opts(
          { value: "pending",  label: "Pending" },
          { value: "paid",     label: "Paid" },
          { value: "failed",   label: "Failed" },
          { value: "refunded", label: "Refunded" },
        ) },
      { param: "method", label: "Payment Method",
        options: opts(
          { value: "razorpay", label: "Online" },
          { value: "cod",      label: "COD" },
        ) },
    ],
  },
  {
    key: "users", label: "Users", desc: "Accounts & contact details", Icon: Users,
    filters: [{ param: "status", label: "Account Status",
      options: opts({ value: "active", label: "Active" }, { value: "blocked", label: "Blocked" }) }],
  },
  {
    key: "products", label: "Products", desc: "Catalogue, pricing & stock", Icon: Package,
    filters: [{ param: "status", label: "Availability",
      options: opts({ value: "available", label: "Available" }, { value: "unavailable", label: "Unavailable" }) }],
  },
  {
    key: "reviews", label: "Reviews", desc: "Ratings & customer feedback", Icon: Star,
    filters: [{ param: "status", label: "Review Status",
      options: opts({ value: "pending", label: "Pending" }, { value: "approved", label: "Approved" }) }],
  },
  {
    key: "inquiries", label: "Inquiries", desc: "Contact form messages", Icon: MessageSquare,
    filters: [{ param: "status", label: "Inquiry Status",
      options: opts({ value: "pending", label: "Pending" }, { value: "responded", label: "Responded" }) }],
  },
  {
    key: "replacements", label: "Replacements", desc: "Replacement requests", Icon: RefreshCcw,
    filters: [{ param: "status", label: "Request Status",
      options: opts(
        { value: "pending",    label: "Pending" },
        { value: "approved",   label: "Approved" },
        { value: "processing", label: "Processing" },
        { value: "completed",  label: "Completed" },
        { value: "rejected",   label: "Rejected" },
      ) }],
  },
  {
    key: "categories", label: "Categories", desc: "Categories & subcategories", Icon: Tag,
    filters: [{ param: "status", label: "Status",
      options: opts({ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }) }],
  },
  {
    key: "events", label: "Events", desc: "Announcements & banners", Icon: Megaphone,
    filters: [{ param: "status", label: "Status",
      options: opts({ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }) }],
  },
];

const FORMATS = [
  { key: "excel", label: "Excel", ext: ".xlsx", desc: "Sortable & filterable", Icon: FileSpreadsheet },
  { key: "pdf",   label: "PDF",   ext: ".pdf",  desc: "Print-ready A4",        Icon: FileText },
];

/* Shared selection styling — one brand-blue accent, everything else slate. */
const cardBase =
  "relative flex rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer";
const cardOn  = "border-brand-500 bg-brand-50/60";
const cardOff = "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50";

const pillBase =
  "px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 cursor-pointer";
const pillOn  = "bg-brand-600 text-white border-brand-600";
const pillOff = "bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600";

function SectionLabel({ step, label, sub }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-black
                      flex items-center justify-center shrink-0">
        {step}
      </div>
      <div>
        <p className="text-sm font-bold text-slate-800 leading-tight">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* Tick shown on the selected card. */
function Tick({ show }) {
  return (
    <span
      className={`absolute top-3 right-3 w-5 h-5 rounded-full bg-brand-600 flex items-center
                  justify-center transition-opacity duration-200 ${show ? "opacity-100" : "opacity-0"}`}
    >
      <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
    </span>
  );
}

/* One row of filter pills. */
function PillRow({ label, options, value, onChange }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`${pillBase} ${value === o.value ? pillOn : pillOff}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DataExport() {
  const [exportType, setExportType] = useState("orders");
  const [format, setFormat]         = useState("excel");
  const [dateRange, setDateRange]   = useState("");
  const [fromDate, setFromDate]     = useState("");
  const [toDate, setToDate]         = useState("");
  const [filterValues, setFilterValues] = useState({});   // { status: "...", method: "..." }
  const [loading, setLoading]       = useState(false);
  const [history, setHistory]       = useState([]);
  const [counts, setCounts]         = useState(null);

  const activeType   = EXPORT_TYPES.find((t) => t.key === exportType);
  const activeFormat = FORMATS.find((f) => f.key === format);

  const previewName = `${exportType}_${new Date().toISOString().slice(0, 10)}${activeFormat.ext}`;
  const valueOf = (param) => filterValues[param] || "all";

  /* Record counts per dataset, so each card shows how much it will export.
     Refetched whenever the date range changes — a custom range only counts
     once both ends are picked. */
  useEffect(() => {
    if (dateRange === "custom" && (!fromDate || !toDate)) return;
    const params = new URLSearchParams();
    if (dateRange) params.set("range", dateRange);
    if (dateRange === "custom") { params.set("from", fromDate); params.set("to", toDate); }

    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${BASE}/export/counts?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCounts(data);
      } catch { /* counts are a nicety — a failure just hides them */ }
    })();
    return () => { cancelled = true; };
  }, [dateRange, fromDate, toDate]);

  const handleExport = async () => {
    if (dateRange === "custom" && (!fromDate || !toDate)) {
      toast.error("Please select both From and To dates"); return;
    }
    if (dateRange === "custom" && new Date(fromDate) > new Date(toDate)) {
      toast.error("From date cannot be after To date"); return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ format });
      if (dateRange) params.set("range", dateRange);
      if (dateRange === "custom") { params.set("from", fromDate); params.set("to", toDate); }
      (activeType.filters || []).forEach(({ param }) => {
        const v = valueOf(param);
        if (v !== "all") params.set(param, v);
      });

      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE}/export/${exportType}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "Export failed"); }

      const blob = await res.blob();
      const filename = `${exportType}_${new Date().toISOString().slice(0, 10)}${activeFormat.ext}`;
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), { href: url, download: filename }).click();
      URL.revokeObjectURL(url);

      setHistory((h) => [
        {
          id: Date.now(),
          filename,
          format,
          size: blob.size,
          time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        },
        ...h,
      ].slice(0, 4));
      toast.success(`${filename} downloaded!`);
    } catch (err) {
      toast.error(err.message || "Export failed");
    } finally {
      setLoading(false);
    }
  };

  const dateLabel =
    dateRange === "" ? "All Time"
    : dateRange === "custom" ? (fromDate && toDate ? `${fromDate} → ${toDate}` : "Custom (incomplete)")
    : DATE_RANGES.find((r) => r.value === dateRange)?.label;

  const fmtSize = (b) =>
    b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

  /* Filters actually in force, for the summary panel. */
  const activeFilters = (activeType.filters || [])
    .map((f) => ({ ...f, value: valueOf(f.param) }))
    .filter((f) => f.value !== "all")
    .map((f) => ({
      label: f.label,
      value: f.options.find((o) => o.value === f.value)?.label || f.value,
    }));

  return (
    <div className="animate-fade-in-up">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Data Export</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Download any part of your store data as Excel or PDF
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">

        {/* ── Left column ─────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Step 1 — Dataset */}
          <div className="admin-card p-6">
            <SectionLabel step="1" label="What do you want to export?" sub={`${EXPORT_TYPES.length} datasets available`} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {EXPORT_TYPES.map(({ key, label, desc, Icon }) => {
                const active = exportType === key;
                return (
                  <button
                    key={key}
                    onClick={() => { setExportType(key); setFilterValues({}); }}
                    className={`${cardBase} items-start gap-3 ${active ? cardOn : cardOff}`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0
                      ${active ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                      <Icon className="w-4 h-4" strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0 pr-5">
                      <p className={`font-bold text-sm ${active ? "text-brand-700" : "text-slate-700"}`}>{label}</p>
                      <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{desc}</p>
                      {counts?.[key] !== undefined && (
                        <p className="text-[11px] font-semibold text-slate-400 mt-1.5">
                          {counts[key].toLocaleString("en-IN")} record{counts[key] === 1 ? "" : "s"}
                        </p>
                      )}
                    </div>
                    <Tick show={active} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2 — Format */}
          <div className="admin-card p-6">
            <SectionLabel step="2" label="Choose file format" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FORMATS.map(({ key, label, ext, desc, Icon }) => {
                const active = format === key;
                return (
                  <button
                    key={key}
                    onClick={() => setFormat(key)}
                    className={`${cardBase} items-center gap-3.5 ${active ? cardOn : cardOff}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                      ${active ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                      <Icon className="w-4 h-4" strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                      <p className={`font-bold text-sm ${active ? "text-brand-700" : "text-slate-700"}`}>
                        {label} <span className="font-normal text-xs text-slate-400">{ext}</span>
                      </p>
                      <p className="text-slate-400 text-xs truncate mt-0.5">{desc}</p>
                    </div>
                    <Tick show={active} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3 — Filters */}
          <div className="admin-card p-6">
            <SectionLabel step="3" label="Apply filters" sub="Optional — leave blank to export all data" />

            <div className="flex flex-col gap-6">
              {/* Date range */}
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Date Range</p>
                <div className="flex flex-wrap gap-2">
                  {DATE_RANGES.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setDateRange(r.value)}
                      className={`${pillBase} ${dateRange === r.value ? pillOn : pillOff}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                {dateRange === "custom" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-4 rounded-xl
                                  bg-slate-50 border border-slate-200 animate-fade-in-up">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">From</label>
                      <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="admin-input" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">To</label>
                      <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="admin-input" />
                    </div>
                  </div>
                )}
              </div>

              {/* Dataset-specific filters */}
              {(activeType.filters || []).map((f) => (
                <PillRow
                  key={f.param}
                  label={f.label}
                  options={f.options}
                  value={valueOf(f.param)}
                  onChange={(v) => setFilterValues((s) => ({ ...s, [f.param]: v }))}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column — sticky summary ────────────── */}
        <div className="flex flex-col gap-4 xl:sticky xl:top-6 xl:self-start">

          {/* Summary */}
          <div className="admin-card p-5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Export Summary</p>

            {/* File preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 mb-4">
              <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center
                              justify-center text-slate-500 shrink-0">
                <activeFormat.Icon className="w-4 h-4" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-700 truncate">{previewName}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{activeType.label} · {dateLabel}</p>
              </div>
            </div>

            {/* Details */}
            <div className="divide-y divide-slate-100">
              {[
                { label: "Dataset",    value: activeType.label },
                { label: "Format",     value: `${activeFormat.label} ${activeFormat.ext}` },
                { label: "Date Range", value: dateLabel },
                ...activeFilters.map((f) => ({ label: f.label, value: f.value })),
                ...(counts?.[exportType] !== undefined
                  ? [{ label: "Records", value: counts[exportType].toLocaleString("en-IN") }]
                  : []),
                { label: "Includes",   value: "Summary + Table" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-xs text-slate-400 shrink-0">{label}</span>
                  <span className="text-xs font-semibold text-slate-700 truncate">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={loading}
            className={`admin-btn w-full py-3.5 ${
              loading
                ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                : "admin-btn-primary"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
                Generating…
              </>
            ) : (
              <>
                <Download className="w-4 h-4" strokeWidth={2.5} />
                Download {activeType.label}
              </>
            )}
          </button>

          {/* Recent exports (this session) */}
          {history.length > 0 && (
            <div className="admin-card p-4 animate-fade-in-up">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3
                            flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" strokeWidth={2.4} />
                Recent exports
              </p>
              <ul className="flex flex-col gap-1">
                {history.map((h) => {
                  const F = FORMATS.find((x) => x.key === h.format).Icon;
                  return (
                    <li key={h.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <F className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={2.2} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-slate-700 truncate">{h.filename}</p>
                        <p className="text-[10px] text-slate-400">{h.time} · {fmtSize(h.size)}</p>
                      </div>
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" strokeWidth={3} />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* What's included */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              What's included
            </p>
            <ul className="flex flex-col gap-2">
              {[
                "Summary section with totals",
                "Full data table with all fields",
                "Filtered by your criteria",
                "Branded Cloud Graphics header",
                format === "excel" ? "Two sheets: Summary + Data" : "Print-ready A4 layout",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
                  <Check className="w-3 h-3 text-brand-500 mt-0.5 shrink-0" strokeWidth={3} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Security note */}
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200">
            <ShieldCheck className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" strokeWidth={2.2} />
            <p className="text-xs text-slate-500 leading-relaxed">
              Admin-only export. Contains sensitive customer data — do not share publicly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
