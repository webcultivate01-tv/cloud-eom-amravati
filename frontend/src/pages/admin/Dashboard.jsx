import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDashboardStats } from "../../features/orders/orderSlice";
import { fetchPaymentStats } from "../../features/payment/paymentSlice";
import { usePanel } from "../../utils/panel";
import { Link } from "react-router-dom";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  ShoppingCart, Users, Package, IndianRupee,
  CalendarDays, TrendingUp, BarChart3, PieChart as PieIcon,
  Tag, Settings, Activity, ArrowRight, Wallet,
} from "lucide-react";

/* ── Status metadata ────────────────────────────────── */
const STATUS_META = {
  Pending:    { color: "#f59e0b", bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-400" },
  Processing: { color: "#3b82f6", bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-400" },
  Printing:   { color: "#8b5cf6", bg: "bg-violet-100",  text: "text-violet-700",  dot: "bg-violet-400" },
  "Ready for Delivery": { color: "#14b8a6", bg: "bg-teal-100", text: "text-teal-700", dot: "bg-teal-400" },
  Shipped:    { color: "#06b6d4", bg: "bg-cyan-100",    text: "text-cyan-700",    dot: "bg-cyan-400" },
  Delivered:  { color: "#10b981", bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-400" },
  Cancelled:  { color: "#ef4444", bg: "bg-red-100",     text: "text-red-600",     dot: "bg-red-400" },
};

/* ── KPI definitions ────────────────────────────────── */
const KPI_DEFS = [
  {
    key: "totalOrders",
    label: "Total Orders",
    icon: ShoppingCart,
    iconBg: "bg-brand-50",
    iconColor: "text-brand-600",
    numColor: "text-brand-700",
    accent: "border-l-brand-500",
  },
  {
    key: "totalUsers",
    label: "Total Customers",
    icon: Users,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    numColor: "text-emerald-700",
    accent: "border-l-emerald-500",
  },
  {
    key: "totalProducts",
    label: "Total Products",
    icon: Package,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    numColor: "text-amber-700",
    accent: "border-l-amber-500",
  },
  {
    key: "totalRevenue",
    label: "Total Revenue",
    icon: IndianRupee,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    numColor: "text-violet-700",
    accent: "border-l-violet-500",
    format: (v) => `₹${(v ?? 0).toLocaleString("en-IN")}`,
  },
];

/* ── Quick actions ──────────────────────────────────────
   Keyed by module rather than by path: the link is built from whichever panel
   is rendering the dashboard, and a card an employee cannot open is dropped
   instead of leading them into a redirect. */
const QUICK_ACTIONS = [
  { module: "products",   label: "Manage Products",  icon: Package,      desc: "Add, edit, delete",    iconBg: "bg-brand-50",   iconColor: "text-brand-600" },
  { module: "orders",     label: "Manage Orders",    icon: ShoppingCart, desc: "Update & ship orders", iconBg: "bg-violet-50",  iconColor: "text-violet-600" },
  { module: "categories", label: "Categories",       icon: Tag,          desc: "Organise catalog",     iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
  { module: "users",      label: "Manage Users",     icon: Users,        desc: "Block & manage",       iconBg: "bg-amber-50",   iconColor: "text-amber-600" },
];

/* ── Helpers ────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-md px-3.5 py-2.5 text-sm">
      {label && <p className="font-semibold text-slate-700 mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color ?? p.fill }} className="font-medium">
          {p.name}: <span className="text-slate-800">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

const RADIAN = Math.PI / 180;
const renderPctLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const Spinner = () => (
  <div className="flex items-center justify-center py-40">
    <div className="w-9 h-9 rounded-full border-4 border-slate-200 border-t-brand-600 animate-spin" />
  </div>
);

const CardHeader = ({ icon: Icon, title, badge }) => (
  <div className="flex items-center justify-between mb-5">
    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
      <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center">
        <Icon size={13} className="text-slate-500" />
      </span>
      {title}
    </h2>
    {badge && (
      <span className="text-[11px] text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
        {badge}
      </span>
    )}
  </div>
);

const ProgressBar = ({ label, rate, count, colorClass }) => (
  <div>
    <div className="flex justify-between items-center mb-1.5">
      <span className="text-sm text-slate-600 font-medium">{label}</span>
      <span className="text-sm text-slate-800 font-bold">
        {rate}%{" "}
        <span className="text-slate-400 font-normal text-xs">({count})</span>
      </span>
    </div>
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${colorClass} rounded-full transition-all duration-500`}
        style={{ width: `${rate}%` }}
      />
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════ */
export default function Dashboard() {
  const dispatch = useDispatch();
  const { stats, loading } = useSelector((s) => s.orders);
  const { stats: payStats } = useSelector((s) => s.payment);
  const { user, base, can } = usePanel();

  useEffect(() => {
    dispatch(fetchDashboardStats());
    dispatch(fetchPaymentStats());
  }, [dispatch]);

  /* Only the cards this account can actually open, linked into its own panel. */
  const quickActions = useMemo(
    () => QUICK_ACTIONS.filter((a) => can(a.module)).map((a) => ({ ...a, to: `${base}/${a.module}` })),
    [base, can]
  );

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  /* ── Computed chart data ── */
  const statusPieData = (stats?.statusCounts ?? []).map((s) => ({
    name: s._id,
    value: s.count,
    color: STATUS_META[s._id]?.color ?? "#94a3b8",
  }));

  const totalOrders = stats?.totalOrders ?? 0;

  const revenuePieData = payStats
    ? [
        { name: "Online (Razorpay)", value: payStats.razorpay.total ?? 0, color: "#05618e" },
        { name: "Cash on Delivery",  value: payStats.cod.total ?? 0,      color: "#f59e0b" },
      ].filter((d) => d.value > 0)
    : [];

  const paymentBarData = payStats
    ? [
        { name: "Online",   Orders: payStats.razorpay.count, fill: "#05618e" },
        { name: "COD",      Orders: payStats.cod.count,      fill: "#f59e0b" },
        { name: "Refunded", Orders: payStats.refunded.count, fill: "#ef4444" },
      ]
    : [];

  const statusBarData = ["Pending","Processing","Printing","Ready for Delivery","Shipped","Delivered","Cancelled"].map(
    (status) => ({
      status,
      Orders: stats?.statusCounts?.find((s) => s._id === status)?.count ?? 0,
      fill: STATUS_META[status]?.color ?? "#94a3b8",
    })
  );

  /* Performance metrics */
  const delivered = stats?.statusCounts?.find((s) => s._id === "Delivered")?.count ?? 0;
  const cancelled = stats?.statusCounts?.find((s) => s._id === "Cancelled")?.count ?? 0;
  const inProgress = ["Pending","Processing","Printing","Ready for Delivery","Shipped"].reduce(
    (sum, s) => sum + (stats?.statusCounts?.find((c) => c._id === s)?.count ?? 0), 0
  );
  const safeTotal = totalOrders || 1;
  const deliveryRate   = Math.round((delivered / safeTotal) * 100);
  const cancelRate     = Math.round((cancelled / safeTotal) * 100);
  const inProgressRate = Math.round((inProgress / safeTotal) * 100);

  const razorpayAvg = payStats?.razorpay.count > 0
    ? Math.round(payStats.razorpay.total / payStats.razorpay.count)
    : 0;
  const codAvg = payStats?.cod.count > 0
    ? Math.round(payStats.cod.total / payStats.cod.count)
    : 0;

  const totalRevenue = (payStats?.razorpay.total ?? 0) + (payStats?.cod.total ?? 0);
  const onlineRevPct = totalRevenue > 0
    ? Math.round(((payStats?.razorpay.total ?? 0) / totalRevenue) * 100)
    : 0;

  return (
    <div className="animate-fade-in-up max-w-[1400px] mx-auto">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            Welcome back,{" "}
            <span className="font-semibold text-slate-700">
              {user?.name?.split(" ")[0] ?? "Admin"}
            </span>. Here's your business overview.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-600
                        bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm">
          <CalendarDays size={13} className="text-slate-400" />
          {today}
        </div>
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            {KPI_DEFS.map((def) => {
              const raw = stats?.[def.key] ?? 0;
              const value = def.format ? def.format(raw) : raw;
              return (
                <div
                  key={def.key}
                  className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5
                              border-l-4 ${def.accent} hover:shadow-md transition-shadow duration-200`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-lg ${def.iconBg} flex items-center justify-center`}>
                      <def.icon size={18} className={def.iconColor} strokeWidth={1.8} />
                    </div>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <TrendingUp size={9} />
                      Active
                    </span>
                  </div>
                  <p className={`text-[1.75rem] font-bold tracking-tight ${def.numColor} leading-none`}>
                    {value}
                  </p>
                  <p className="text-slate-500 text-xs font-medium mt-2">{def.label}</p>
                </div>
              );
            })}
          </div>

          {/* ── Chart Row 1: Status Donut | Revenue Pie ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

            {/* Order Status Donut */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <CardHeader icon={PieIcon} title="Order Status Distribution" badge="All time" />
              {statusPieData.length === 0 ? (
                <div className="flex items-center justify-center h-52 text-slate-400 text-sm">
                  No order data yet.
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative w-full sm:w-[200px] h-[200px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusPieData}
                          cx="50%" cy="50%"
                          innerRadius={58} outerRadius={88}
                          paddingAngle={3}
                          dataKey="value"
                          labelLine={false}
                          label={renderPctLabel}
                        >
                          {statusPieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-2xl font-bold text-slate-800">{totalOrders}</p>
                      <p className="text-[11px] text-slate-400 font-medium">Total</p>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 w-full">
                    {statusPieData.map((s) => {
                      const m = STATUS_META[s.name] ?? {};
                      const pct = totalOrders > 0 ? Math.round((s.value / totalOrders) * 100) : 0;
                      return (
                        <div key={s.name} className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${m.dot ?? "bg-slate-400"}`} />
                          <span className="text-slate-600 text-xs font-medium flex-1">{s.name}</span>
                          <span className="text-slate-800 text-xs font-bold">{s.value}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${m.bg ?? ""} ${m.text ?? "text-slate-600"}`}>
                            {pct}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Revenue Split Donut */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <CardHeader icon={Wallet} title="Revenue by Payment Method" badge="All time" />
              {revenuePieData.length === 0 ? (
                <div className="flex items-center justify-center h-52 text-slate-400 text-sm">
                  No revenue data yet.
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative w-full sm:w-[200px] h-[200px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={revenuePieData}
                          cx="50%" cy="50%"
                          innerRadius={58} outerRadius={88}
                          paddingAngle={3}
                          dataKey="value"
                          labelLine={false}
                          label={renderPctLabel}
                        >
                          {revenuePieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip
                          content={<ChartTooltip />}
                          formatter={(v) => `₹${v.toLocaleString("en-IN")}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-lg font-bold text-slate-800">{onlineRevPct}%</p>
                      <p className="text-[10px] text-slate-400 font-medium">Online</p>
                    </div>
                  </div>
                  <div className="flex-1 space-y-4 w-full">
                    {revenuePieData.map((d) => (
                      <div key={d.name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                            <span className="text-xs text-slate-600 font-medium">{d.name}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-800">
                            ₹{d.value.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              background: d.color,
                              width: `${totalRevenue > 0 ? Math.round((d.value / totalRevenue) * 100) : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    {payStats && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-[11px] text-slate-400 font-medium mb-2">Refunds</p>
                        <p className="text-base font-bold text-brand-600">
                          ₹{(payStats.refunded.total ?? 0).toLocaleString("en-IN")}
                        </p>
                        <p className="text-[11px] text-slate-400">{payStats.refunded.count} orders refunded</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Chart Row 2: Payment Bar | Performance Panel ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

            {/* Payment Method Bar Chart */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <CardHeader icon={BarChart3} title="Orders by Payment Method" badge="Count" />
              {paymentBarData.length === 0 ? (
                <div className="flex items-center justify-center h-52 text-slate-400 text-sm">
                  No payment data yet.
                </div>
              ) : (
                <>
                  <div className="h-[180px] mb-5">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={paymentBarData} barSize={44} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b", fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc", radius: 4 }} />
                        <Bar dataKey="Orders" radius={[6, 6, 0, 0]}>
                          {paymentBarData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {payStats && (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Online",  amount: payStats.razorpay.total, count: payStats.razorpay.count,  bg: "bg-brand-50",  val: "text-brand-700" },
                        { label: "COD",     amount: payStats.cod.total,      count: payStats.cod.count,       bg: "bg-amber-50",   val: "text-amber-700" },
                        { label: "Refund",  amount: payStats.refunded.total, count: payStats.refunded.count,  bg: "bg-red-50",     val: "text-red-600" },
                      ].map((p) => (
                        <div key={p.label} className={`rounded-lg p-3 ${p.bg} text-center`}>
                          <p className={`text-sm font-bold ${p.val}`}>
                            ₹{(p.amount ?? 0).toLocaleString("en-IN")}
                          </p>
                          <p className="text-slate-500 text-[11px] font-medium mt-0.5">{p.label}</p>
                          <p className="text-slate-400 text-[10px]">{p.count} orders</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Order Performance Panel */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <CardHeader icon={Activity} title="Order Performance" badge="All time" />
              <div className="space-y-4 mb-6">
                <ProgressBar label="Delivered"   rate={deliveryRate}   count={delivered}   colorClass="bg-emerald-500" />
                <ProgressBar label="In Progress" rate={inProgressRate} count={inProgress}  colorClass="bg-brand-500" />
                <ProgressBar label="Cancelled"   rate={cancelRate}     count={cancelled}   colorClass="bg-red-400" />
              </div>
              <div className="border-t border-slate-100 pt-5">
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest mb-3">
                  Average Order Value
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-brand-50 rounded-lg p-3.5 text-center">
                    <p className="text-brand-700 font-bold text-lg leading-none">
                      ₹{razorpayAvg.toLocaleString("en-IN")}
                    </p>
                    <p className="text-slate-500 text-[11px] mt-1.5">Avg Online Order</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3.5 text-center">
                    <p className="text-amber-700 font-bold text-lg leading-none">
                      ₹{codAvg.toLocaleString("en-IN")}
                    </p>
                    <p className="text-slate-500 text-[11px] mt-1.5">Avg COD Order</p>
                  </div>
                </div>
              </div>
              {payStats && (
                <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-slate-800 font-bold text-base">
                      {payStats.razorpay.count + payStats.cod.count}
                    </p>
                    <p className="text-slate-400 text-[11px] mt-0.5">Revenue Orders</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-slate-800 font-bold text-base">
                      ₹{(stats?.totalRevenue ?? 0).toLocaleString("en-IN")}
                    </p>
                    <p className="text-slate-400 text-[11px] mt-0.5">Total Revenue</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Horizontal Status Bar Chart ── */}
          {stats?.statusCounts?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-5">
              <CardHeader icon={BarChart3} title="Order Status Breakdown" badge="All statuses" />
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={statusBarData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, bottom: 5, left: 60 }}
                    barSize={14}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="status"
                      tick={{ fontSize: 12, fill: "#475569", fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      width={70}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc" }} />
                    <Bar dataKey="Orders" radius={[0, 6, 6, 0]}>
                      {statusBarData.map((entry) => (
                        <Cell key={entry.status} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Quick Actions — hidden entirely when this account holds none
               of these sections, rather than left as an empty panel ── */}
          {quickActions.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <CardHeader icon={Settings} title="Quick Actions" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {quickActions.map(({ to, label, icon: Icon, desc, iconBg, iconColor }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 p-4 rounded-xl border border-slate-200
                             hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm
                             transition-all duration-200 group"
                >
                  <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                    <Icon size={18} className={iconColor} strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm leading-tight truncate">{label}</p>
                    <p className="text-slate-400 text-[11px] mt-0.5 truncate">{desc}</p>
                  </div>
                  <ArrowRight
                    size={14}
                    className="ml-auto text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors"
                  />
                </Link>
              ))}
            </div>
          </div>
          )}
        </>
      )}
    </div>
  );
}
