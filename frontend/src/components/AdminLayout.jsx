import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import api from "../utils/api";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../features/auth/authSlice";
import { clearCart } from "../features/cart/cartSlice";
import { fetchPendingCount } from "../features/inquiry/inquirySlice";
import { toast } from "react-toastify";
import { Bell, Home, LogOut, Menu, X, ChevronRight } from "lucide-react";
import { usePanel } from "../utils/panel";
import logoMark from "../assets/logo-mark.png";
import logoFull from "../assets/logo.png";

/* "2 minutes ago", "22 hours ago" — falls back to the date after a week */
const timeAgo = (date) => {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (secs < 60) return "Just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

/**
 * The back-office shell — sidebar, topbar and notification bell.
 *
 * One layout serves both panels. The navigation comes from usePanel(), which
 * prunes it to the modules the signed-in account holds, so an employee sees
 * the same chrome as an admin with only their own sections in it.
 */
export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bellOpen, setBellOpen] = useState(false);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentInquiries, setRecentInquiries] = useState([]);
  const [, setTick] = useState(0);
  const bellRef    = useRef(null);
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const location   = useLocation();
  const { pendingCount } = useSelector((s) => s.inquiry);
  const { user, base, sections, badge, title, can } = usePanel();

  /* Both badge feeds are behind their own module, so they are only polled for
     an account that holds it — otherwise every tick would be a 403. */
  const canSeeInquiries = can("inquiries");
  const canSeeOrders    = can("orders");

  useEffect(() => {
    if (!canSeeInquiries) return;
    dispatch(fetchPendingCount());
    const id = setInterval(() => dispatch(fetchPendingCount()), 30_000);
    return () => clearInterval(id);
  }, [dispatch, canSeeInquiries]);

  /* Latest pending enquiries for the bell list. Refetched whenever the pending
     count changes (new enquiry in, or one replied to / deleted). */
  useEffect(() => {
    if (!canSeeInquiries) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/inquiry");
        if (cancelled) return;
        setRecentInquiries(
          (Array.isArray(data) ? data : [])
            .filter((q) => q.status === "pending")
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        );
      } catch { /* bell list is non-critical */ }
    })();
    return () => { cancelled = true; };
  }, [pendingCount, canSeeInquiries]);

  /* Enquiries the admin has already clicked in the bell. Kept per browser —
     once opened they drop out of the bell and the badge. */
  const [seenInquiries, setSeenInquiries] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cg_seen_inquiries") || "[]"); } catch { return []; }
  });
  const unseenInquiries = recentInquiries.filter((q) => !seenInquiries.includes(q._id));
  const openInquiry = (id) => {
    const next = [...seenInquiries, id].slice(-200);
    setSeenInquiries(next);
    try { localStorage.setItem("cg_seen_inquiries", JSON.stringify(next)); } catch { /* ignore */ }
    setBellOpen(false);
    navigate(`${base}/inquiries?inquiry=${id}`);
  };

  /* New orders = placed since this admin last opened the Orders page. Opening
     that page marks them seen on the server (so it holds across devices), and
     the badge + notifications clear. Otherwise poll for fresh ones. */
  useEffect(() => {
    if (!canSeeOrders) return;
    let cancelled = false;
    const onOrdersPage = location.pathname.startsWith(`${base}/orders`);
    const load = async (markSeen) => {
      try {
        if (markSeen) {
          await api.put("/orders/admin/mark-seen");
          if (!cancelled) { setPendingOrders(0); setRecentOrders([]); }
          return;
        }
        const { data } = await api.get("/orders/admin/recent");
        if (!cancelled) { setPendingOrders(data.newCount); setRecentOrders(data.recent); }
      } catch { /* badge is non-critical */ }
    };
    // Entering the Orders page clears the badge; later polls (below) surface
    // any order that arrives while the admin is sitting on it.
    load(onOrdersPage);
    const id = setInterval(() => load(false), 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [location.pathname, base, canSeeOrders]);

  /* Keep the "x minutes ago" labels moving while the page sits open */
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!bellOpen) return;
    const close = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [bellOpen]);

  const bellCount = pendingOrders + unseenInquiries.length;

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearCart());
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const initials = user?.name?.[0]?.toUpperCase() ?? "A";

  return (
    <div className="admin-shell flex min-h-screen bg-slate-50">
      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside
        className="admin-sidebar flex flex-col sticky top-0 h-screen shrink-0 overflow-hidden z-20"
        style={{
          width: sidebarOpen ? "256px" : "68px",
          transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Brand row — the real lockup from the website (mark, wordmark and the
            tagline under it), not a stand-in built from the mark plus typed
            text. Centred and kept modest: the sidebar header should read as a
            quiet mark, not as the loudest thing on the screen. The close button
            sits absolutely on the right so it cannot pull the logo off centre. */}
        <div className="relative flex items-center justify-center px-4 border-b border-slate-100 shrink-0 h-[64px]">
          {sidebarOpen ? (
            <img
              src={logoFull}
              alt="Cloud Graphics — Visual Solution For Your Business"
              className="h-[38px] w-auto shrink-0"
            />
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              title="Open sidebar"
              aria-label="Open sidebar"
              className="group w-9 h-9 shrink-0 rounded-lg bg-brand-600 hover:bg-brand-700
                         flex items-center justify-center transition-colors duration-150"
            >
              <img src={logoMark} alt="" aria-hidden="true" className="w-6 h-auto group-hover:hidden brightness-0 invert" />
              <Menu className="text-white hidden group-hover:block" size={16} />
            </button>
          )}
          {sidebarOpen && (
            /* The lockup carries the name and tagline on its own — text typed
               beside it only crowds the mark. Which panel the admin is in is
               already stated in the topbar. */
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg
                         text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-150"
              title="Close sidebar"
              aria-label="Close sidebar"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-y-auto scrollbar-hide">
          {sections.map((section) => (
            <div key={section.label} className="mb-1">
              {sidebarOpen && (
                <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 select-none">
                  {section.label}
                </p>
              )}
              {!sidebarOpen && (
                <div className="my-2 mx-3 h-px bg-slate-100" />
              )}
              {section.items.map(({ to, icon: Icon, label, inquiryBadge, orderBadge }) => {
                const badge = inquiryBadge || orderBadge;
                const count = orderBadge ? pendingOrders : unseenInquiries.length;
                const badgeBg = orderBadge ? "bg-red-500" : "bg-brand-500";
                return (
                <NavLink
                  key={to}
                  to={to}
                  title={!sidebarOpen ? label : undefined}
                  className={({ isActive }) =>
                    `group flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium
                     transition-all duration-150 whitespace-nowrap select-none relative
                     ${!sidebarOpen ? "justify-center" : ""}
                     ${isActive
                       ? "bg-brand-50 text-brand-700"
                       : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                     }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-600 rounded-r-full" />
                      )}
                      <span className="shrink-0 relative">
                        <Icon size={16} strokeWidth={isActive ? 2.5 : 1.8} />
                        {badge && count > 0 && !sidebarOpen && (
                          <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 ${badgeBg} text-white
                                           text-[9px] font-bold rounded-full flex items-center justify-center leading-none`}>
                            {count > 9 ? "9+" : count}
                          </span>
                        )}
                      </span>
                      {sidebarOpen && <span className="flex-1">{label}</span>}
                      {sidebarOpen && badge && count > 0 && (
                        <span className={`ml-auto ${badgeBg} text-white text-[10px] font-bold rounded-full
                                         px-1.5 py-0.5 min-w-[20px] text-center leading-none`}>
                          {count > 99 ? "99+" : count}
                        </span>
                      )}
                      {sidebarOpen && !badge && isActive && (
                        <ChevronRight size={13} className="ml-auto text-brand-400" />
                      )}
                    </>
                  )}
                </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 pb-4 pt-3 border-t border-slate-100 flex flex-col gap-0.5 shrink-0">
          <NavLink
            to="/"
            title={!sidebarOpen ? "Back to Site" : undefined}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] text-slate-500
                        hover:text-slate-900 hover:bg-slate-50 transition-all whitespace-nowrap
                        ${!sidebarOpen ? "justify-center" : ""}`}
          >
            <Home size={16} strokeWidth={1.8} />
            {sidebarOpen && <span>Back to Site</span>}
          </NavLink>
          <button
            onClick={handleLogout}
            title={!sidebarOpen ? "Logout" : undefined}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px]
                        text-brand-500 hover:text-brand-700 hover:bg-brand-50
                        transition-all whitespace-nowrap w-full
                        ${!sidebarOpen ? "justify-center" : ""}`}
          >
            <LogOut size={16} strokeWidth={1.8} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-200 px-6 h-[64px]
                           flex items-center justify-between sticky top-0 z-10 shadow-none shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-slate-500 text-xs font-medium hidden sm:block">Live</span>
            </div>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <span className="text-slate-700 font-semibold text-sm hidden sm:block">{title}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setBellOpen((o) => !o)}
                aria-label="Notifications"
                className="relative w-9 h-9 flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer
                           text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <Bell size={18} />
                {bellCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px]
                                   font-bold rounded-full flex items-center justify-center leading-none">
                    {bellCount > 9 ? "9+" : bellCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 top-11 w-[340px] max-w-[calc(100vw-2rem)] bg-white border border-slate-200
                                rounded-2xl shadow-xl z-30 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <p className="text-slate-900 font-bold text-sm m-0">Notifications</p>
                    {bellCount > 0 && (
                      <span className="bg-red-50 text-red-600 text-[11px] font-bold px-2 py-0.5 rounded-full">
                        {bellCount} new
                      </span>
                    )}
                  </div>

                  <div className="max-h-[360px] overflow-y-auto">
                    {recentOrders.length === 0 && unseenInquiries.length === 0 && (
                      <p className="text-slate-400 text-[13px] text-center py-8 m-0">No new notifications</p>
                    )}
                    {unseenInquiries.slice(0, 5).map((q) => (
                      <button
                        key={q._id}
                        onClick={() => openInquiry(q._id)}
                        className="w-full text-left flex gap-3 px-4 py-3 border-none border-b border-slate-50 bg-white
                                   hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <span className="mt-1.5 w-2 h-2 rounded-full shrink-0 bg-red-500" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-slate-800 text-[13px] font-bold leading-tight">New enquiry</span>
                          <span className="block text-slate-500 text-[12px] mt-0.5 truncate">
                            {q.name} · {q.subject}
                          </span>
                          <span className="block text-slate-400 text-[11px] font-semibold mt-1">{timeAgo(q.createdAt)}</span>
                        </span>
                      </button>
                    ))}
                    {recentOrders.map((o) => {
                      const isNew = true; // the bell only lists unseen orders
                      return (
                        <button
                          key={o._id}
                          onClick={() => { setBellOpen(false); navigate(`${base}/orders?order=${o._id}`); }}
                          className="w-full text-left flex gap-3 px-4 py-3 border-none border-b border-slate-50 bg-white
                                     hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${isNew ? "bg-red-500" : "bg-transparent"}`} />
                          <span className="flex-1 min-w-0">
                            <span className="block text-slate-800 text-[13px] font-bold leading-tight">
                              New order{o.orderNumber ? ` #${o.orderNumber}` : ""}
                            </span>
                            <span className="block text-slate-500 text-[12px] mt-0.5 truncate">
                              {o.shippingAddress?.fullName} · ₹{o.totalPrice?.toLocaleString("en-IN")} ·{" "}
                              {o.paymentMethod === "cod" ? "COD" : "Paid online"}
                            </span>
                            <span className="block text-slate-400 text-[11px] font-semibold mt-1">{timeAgo(o.createdAt)}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex border-t border-slate-100 text-[12px] font-bold">
                    {canSeeOrders && (
                      <NavLink to={`${base}/orders`} onClick={() => setBellOpen(false)}
                        className="flex-1 text-center py-3 text-brand-700 no-underline hover:bg-slate-50">
                        View all orders
                      </NavLink>
                    )}
                    {canSeeInquiries && pendingCount > 0 && (
                      <NavLink to={`${base}/inquiries`} onClick={() => setBellOpen(false)}
                        className="flex-1 text-center py-3 text-slate-600 no-underline border-l border-slate-100 hover:bg-slate-50">
                        {pendingCount} pending enquir{pendingCount === 1 ? "y" : "ies"}
                      </NavLink>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-7 w-px bg-slate-100" />

            <div className="text-right hidden sm:block">
              <p className="text-slate-800 text-sm font-semibold leading-tight">{user?.name}</p>
              <p className="text-slate-400 text-[11px]">{user?.email}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-brand-600
                            text-white flex items-center justify-center font-bold text-sm">
              {initials}
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${
              user?.role === "admin"
                ? user.adminRole === "superAdmin"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-brand-100 text-brand-700"
                : "bg-emerald-100 text-emerald-700"
            }`}>
              {badge}
            </span>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
