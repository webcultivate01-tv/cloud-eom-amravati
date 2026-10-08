import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  BarChart3, FileText, Download, FileSpreadsheet, IndianRupee, Receipt,
  ShoppingBag, Landmark, Users, Loader2, TrendingUp, CreditCard, Banknote,
} from "lucide-react";
import api from "../../utils/api";
import { downloadFile } from "../../utils/download";

/* ── Period control ─────────────────────────────────────────── */
const RANGES = [
  { label: "Today",        value: "today" },
  { label: "Last 7 days",  value: "7days" },
  { label: "Last 30 days", value: "30days" },
  { label: "Last 90 days", value: "90days" },
  { label: "This year",    value: "thisyear" },
  { label: "All time",     value: "all" },
  { label: "Custom",       value: "custom" },
];

/* ── Chart tokens ───────────────────────────────────────────────
   One accent for the whole page: revenue is a single series, so it
   needs no palette — the title says what is plotted. The payment
   mix is the only place two hues carry identity, and that pair was
   validated for colour-vision separation against a white surface
   (worst-case ΔE 19.3 under protanopia, 32.3 normal vision). */
const ACCENT = "#05618e";      // brand — online / revenue
const ACCENT_ALT = "#eb6834";  // cash on delivery
const GRID = "#eef2f6";        // hairline, one step off the surface
const AXIS_INK = "#94a3b8";

const inr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const inr2 = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const shortDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/* ── Downloadable reports ───────────────────────────────────── */
const REPORT_CARDS = [
  { key: "sales",    label: "Sales Report",   Icon: ShoppingBag, desc: "Every settled sale with its value and payment method." },
  { key: "gst",      label: "GST Summary",    Icon: Landmark,    desc: "Taxable value, CGST and SGST for the return filing." },
  { key: "invoices", label: "Bills Register", Icon: Receipt,     desc: "All tax invoices raised, in issue order." },
  { key: "payments", label: "Payment Report", Icon: CreditCard,  desc: "Money collected online and in cash, plus refunds." },
  { key: "products", label: "Product Sales",  Icon: BarChart3,   desc: "What sold, ranked by revenue earned." },
];

/* A stat tile: label, value, and an optional supporting line. The
   value is the loudest thing on the tile, in the same sans as the
   rest of the panel. */
const Stat = ({ label, value, sub, Icon, tone = "brand" }) => {
  const tones = {
    brand:   "bg-brand-50 text-brand-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber:   "bg-amber-50 text-amber-600",
    slate:   "bg-slate-100 text-slate-500",
  };
  return (
    <div className="admin-card p-4">
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-tight">{label}</p>
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tones[tone]}`}>
          <Icon size={14} />
        </span>
      </div>
      <p className="text-[22px] font-black text-slate-900 leading-none">{value}</p>
      {sub && <p className="text-[11.5px] text-slate-400 mt-1.5 font-medium">{sub}</p>}
    </div>
  );
};

/* Crosshair tooltip for the revenue series. */
const RevenueTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3.5 py-2.5">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider m-0 mb-1.5">
        {new Date(label).toLocaleDateString("en-IN", { dateStyle: "medium" })}
      </p>
      <p className="text-[15px] font-black text-slate-900 m-0">{inr(row.revenue)}</p>
      <p className="text-[11.5px] text-slate-500 m-0 mt-0.5">
        {row.orders} {row.orders === 1 ? "order" : "orders"}
      </p>
    </div>
  );
};

export default function Reports() {
  const [range, setRange] = useState("30days");
  const [from, setFrom]   = useState("");
  const [to, setTo]       = useState("");
  const [busy, setBusy]   = useState(null);

  /* The fetched overview is stamped with the period it describes.
     "Loading" is then simply "what I hold doesn't match what is
     selected" — derived rather than a second state to keep in step,
     so a stale response can never leave the spinner running. */
  const [result, setResult] = useState(null);

  const params = useMemo(() => {
    const p = { range };
    if (range === "custom") { if (from) p.from = from; if (to) p.to = to; }
    return p;
  }, [range, from, to]);

  const paramsKey = JSON.stringify(params);
  const loading = result?.key !== paramsKey;
  const data = result?.key === paramsKey ? result.payload : result?.payload ?? null;

  useEffect(() => {
    let cancelled = false;
    // A custom range with neither end set would report on the wrong window
    if (range === "custom" && !from && !to) return undefined;

    api.get("/reports/overview", { params: JSON.parse(paramsKey) })
      .then(({ data }) => { if (!cancelled) setResult({ key: paramsKey, payload: data }); })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err.response?.data?.message || "Could not load reports");
        // Stamped with the same key so the page stops waiting on a
        // request that is never going to arrive.
        setResult({ key: paramsKey, payload: null });
      });

    return () => { cancelled = true; };
  }, [paramsKey, range, from, to]);

  const handleDownload = async (key, format) => {
    setBusy(`${key}-${format}`);
    try {
      await downloadFile(`/reports/${key}`, `${key}-report.${format === "excel" ? "xlsx" : "pdf"}`, { ...params, format });
      toast.success(`${REPORT_CARDS.find((r) => r.key === key).label} downloaded`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const t = data?.totals;
  const split = data?.paymentSplit || [];
  const splitTotal = split.reduce((s, r) => s + r.amount, 0);
  const topProducts = data?.topProducts || [];
  const maxProductRevenue = Math.max(1, ...topProducts.map((p) => p.revenue));

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600" /> Reports
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Sales, tax and payment reporting{data?.period ? ` · ${data.period}` : ""}
          </p>
        </div>
      </div>

      {/* Period filter — one row, above everything it controls */}
      <div className="admin-card p-4 mb-5">
        <div className="flex flex-wrap gap-2">
          {RANGES.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                range === value
                  ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                  : "bg-white text-slate-500 border-slate-200 hover:border-brand-300 hover:text-brand-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {range === "custom" && (
          <div className="flex items-center gap-2 flex-wrap mt-3">
            <input type="date" className="admin-input !w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-slate-400 text-sm font-medium">→</span>
            <input type="date" className="admin-input !w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        )}
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-24">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
            <div className="absolute inset-0 rounded-full border-4 border-t-brand-600 animate-spin" />
          </div>
        </div>
      ) : (
        <>
          {/* ── Headline figures ─────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-5">
            <Stat label="Gross Sales"   value={inr(t?.gross)}         sub={`${t?.orders || 0} settled orders`} Icon={IndianRupee} tone="brand" />
            <Stat label="GST Payable"   value={inr(t?.gst)}           sub={`CGST ${inr(t?.cgst)} · SGST ${inr(t?.sgst)}`} Icon={Landmark} tone="amber" />
            <Stat label="Taxable Value" value={inr(t?.taxable)}       sub={`Net of ${data?.gstRate?.total ?? 18}% GST`} Icon={Receipt} tone="slate" />
            <Stat label="Bills Raised"  value={t?.billsRaised ?? 0}   sub="Tax invoices issued" Icon={FileText} tone="emerald" />
            <Stat label="Avg Order"     value={inr(t?.avgOrderValue)} sub={`${t?.units || 0} units sold`} Icon={TrendingUp} tone="brand" />
            <Stat label="New Customers" value={t?.newCustomers ?? 0}  sub={`${t?.pendingOrders || 0} orders in progress`} Icon={Users} tone="slate" />
          </div>

          {/* ── Revenue over time ────────────────────────────── */}
          <div className="admin-card p-5 mb-5">
            <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
              <h2 className="text-[15px] font-black text-slate-800 m-0">Revenue over time</h2>
              <p className="text-[12px] text-slate-400 font-medium m-0">{data?.period}</p>
            </div>
            <p className="text-[12.5px] text-slate-400 m-0 mb-4">
              Settled sales per day, inclusive of GST.
            </p>

            {data?.series?.length ? (
              /* Height covers the plot and the axis band, so the card
                 never grows its own inner scrollbar. */
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.series} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="revenueWash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={ACCENT} stopOpacity={0.16} />
                      <stop offset="100%" stopColor={ACCENT} stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
                  <XAxis
                    dataKey="date" tickFormatter={shortDate}
                    tick={{ fill: AXIS_INK, fontSize: 11 }}
                    axisLine={{ stroke: GRID }} tickLine={false} minTickGap={24}
                  />
                  <YAxis
                    tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
                    tick={{ fill: AXIS_INK, fontSize: 11 }}
                    axisLine={false} tickLine={false} width={46}
                  />
                  <Tooltip content={<RevenueTooltip />} cursor={{ stroke: ACCENT, strokeWidth: 1, strokeOpacity: 0.35 }} />
                  <Area
                    type="monotone" dataKey="revenue"
                    stroke={ACCENT} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                    fill="url(#revenueWash)"
                    activeDot={{ r: 4.5, fill: ACCENT, stroke: "#fff", strokeWidth: 2 }}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-16 text-center">
                <p className="text-slate-400 text-sm font-medium m-0">No settled sales in this period.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            {/* ── Payment mix ────────────────────────────────── */}
            <div className="admin-card p-5">
              <h2 className="text-[15px] font-black text-slate-800 m-0">How customers paid</h2>
              <p className="text-[12.5px] text-slate-400 m-0 mb-5">Share of settled revenue by method.</p>

              {splitTotal > 0 ? (
                <>
                  {/* Proportion bar — two categories, so a bar rather than
                      a pie. A 2px surface gap does the separating. */}
                  <div className="flex h-3 w-full mb-5" role="img"
                    aria-label={split.map((s) => `${s.method} ${Math.round((s.amount / splitTotal) * 100)}%`).join(", ")}>
                    {split.filter((s) => s.amount > 0).map((s, i, arr) => (
                      <div
                        key={s.method}
                        style={{
                          width: `${(s.amount / splitTotal) * 100}%`,
                          background: s.method === "Online" ? ACCENT : ACCENT_ALT,
                          marginRight: i < arr.length - 1 ? 2 : 0,
                        }}
                        className="first:rounded-l-full last:rounded-r-full"
                      />
                    ))}
                  </div>

                  <div className="flex flex-col gap-3.5">
                    {split.map((s) => (
                      <div key={s.method} className="flex items-center gap-3">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: s.method === "Online" ? ACCENT : ACCENT_ALT }}
                        />
                        <span className="flex items-center gap-1.5 text-[13.5px] font-bold text-slate-700 min-w-[104px]">
                          {s.method === "Online" ? <CreditCard size={13} className="text-slate-400" /> : <Banknote size={13} className="text-slate-400" />}
                          {s.method === "Online" ? "Paid online" : "Cash on delivery"}
                        </span>
                        <span className="text-[12px] text-slate-400 font-medium">
                          {s.orders} {s.orders === 1 ? "order" : "orders"}
                        </span>
                        <span className="ml-auto text-[14px] font-black text-slate-900 tabular-nums">{inr(s.amount)}</span>
                        <span className="text-[12px] text-slate-400 font-semibold w-11 text-right tabular-nums">
                          {Math.round((s.amount / splitTotal) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>

                  {t?.refunded > 0 && (
                    <p className="text-[12px] text-slate-400 mt-5 pt-4 border-t border-slate-100 m-0">
                      {inr(t.refunded)} refunded across {t.refundCount} {t.refundCount === 1 ? "order" : "orders"}.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-slate-400 text-sm font-medium py-10 text-center m-0">No payments in this period.</p>
              )}
            </div>

            {/* ── Tax position ───────────────────────────────── */}
            <div className="admin-card p-5">
              <h2 className="text-[15px] font-black text-slate-800 m-0">Tax position</h2>
              <p className="text-[12.5px] text-slate-400 m-0 mb-5">
                Prices are GST-inclusive, so tax is taken out of what was charged.
              </p>

              <div className="flex flex-col">
                {[
                  ["Gross receipts", t?.gross, false],
                  ["Taxable value", t?.taxable, false],
                  [`CGST @ ${data?.gstRate?.cgst ?? 9}%`, t?.cgst, false],
                  [`SGST @ ${data?.gstRate?.sgst ?? 9}%`, t?.sgst, false],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-100">
                    <span className="text-[13.5px] text-slate-500 font-medium">{label}</span>
                    <span className="text-[13.5px] font-bold text-slate-800 tabular-nums">{inr2(value)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-4 mt-1">
                  <span className="text-[13.5px] font-black text-slate-800">Total GST payable</span>
                  <span className="text-[19px] font-black text-brand-700 tabular-nums">{inr2(t?.gst)}</span>
                </div>
              </div>

              <button
                onClick={() => handleDownload("gst", "excel")}
                disabled={busy === "gst-excel"}
                className="w-full mt-5 inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-bold py-2.5 rounded-xl border-none cursor-pointer transition-colors disabled:opacity-60"
              >
                {busy === "gst-excel" ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                Export GST workings
              </button>
            </div>
          </div>

          {/* ── Top products ─────────────────────────────────── */}
          {topProducts.length > 0 && (
            <div className="admin-card p-5 mb-5">
              <h2 className="text-[15px] font-black text-slate-800 m-0">Best sellers by revenue</h2>
              <p className="text-[12.5px] text-slate-400 m-0 mb-5">Top {topProducts.length} products in this period.</p>

              <div className="flex flex-col gap-3.5">
                {topProducts.map((p) => (
                  <div key={p.name}>
                    <div className="flex items-baseline justify-between gap-3 mb-1.5">
                      <span className="text-[13.5px] font-semibold text-slate-700 truncate">{p.name}</span>
                      <span className="text-[13px] font-black text-slate-900 shrink-0 tabular-nums">{inr(p.revenue)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Thin bar, rounded at the data end, square at the baseline */}
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-r-full"
                          style={{ width: `${(p.revenue / maxProductRevenue) * 100}%`, background: ACCENT }}
                        />
                      </div>
                      <span className="text-[11.5px] text-slate-400 font-semibold w-20 text-right shrink-0 tabular-nums">
                        {p.units} units
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Downloads ────────────────────────────────────── */}
          <div className="admin-card p-5">
            <h2 className="text-[15px] font-black text-slate-800 m-0">Download reports</h2>
            <p className="text-[12.5px] text-slate-400 m-0 mb-5">
              Every report covers the period selected above. PDF to print or send on, Excel to work with.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {REPORT_CARDS.map(({ key, label, Icon, desc }) => (
                <div key={key} className="border border-slate-200 rounded-xl p-4 hover:border-brand-200 hover:bg-brand-50/30 transition-colors flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-black text-slate-800 m-0">{label}</p>
                      <p className="text-[12px] text-slate-400 leading-relaxed m-0 mt-0.5">{desc}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => handleDownload(key, "pdf")}
                      disabled={busy === `${key}-pdf`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 text-[12px] font-bold text-slate-600 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 py-2 rounded-lg cursor-pointer transition-colors disabled:opacity-60"
                    >
                      {busy === `${key}-pdf` ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                      PDF
                    </button>
                    <button
                      onClick={() => handleDownload(key, "excel")}
                      disabled={busy === `${key}-excel`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 text-[12px] font-bold text-white bg-brand-600 hover:bg-brand-700 border-none py-2 rounded-lg cursor-pointer transition-colors disabled:opacity-60"
                    >
                      {busy === `${key}-excel` ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      Excel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
