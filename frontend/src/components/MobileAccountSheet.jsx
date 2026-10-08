import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  X, Mail, Phone, ShieldCheck, LayoutDashboard, Package, Heart, RefreshCcw,
  ShoppingCart, Headphones, LogOut, ChevronRight, UserCog, Boxes, Users, Info, Sparkles,
} from "lucide-react";
import api from "../utils/api";
import { logout } from "../features/auth/authSlice";
import { clearCart, selectCartCount } from "../features/cart/cartSlice";
import { selectFavoriteCount } from "../features/favorites/favoritesSlice";
import { usePanel, EMPLOYEE_ROLE_LABELS } from "../utils/panel";

const BRAND = "#05618e";

/* Kept in step with .cg-sheet-out / .cg-overlay-out in index.css */
const EXIT_MS = 300;

function Row({ to, icon: Icon, label, hint, onClose, danger }) {
  return (
    <Link
      to={to}
      onClick={onClose}
      className="flex items-center gap-3 px-4 py-3.5 no-underline border-b border-slate-100 last:border-b-0 active:bg-slate-50"
      style={{ color: danger ? BRAND : "#1F2937", WebkitTapHighlightColor: "transparent" }}
    >
      <span
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: danger ? "rgba(5, 97, 142,0.08)" : "#F5F5F4", color: danger ? BRAND : "#475569" }}
      >
        <Icon size={17} strokeWidth={2} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13.5px] font-semibold leading-tight">{label}</span>
        {hint && <span className="block text-[11px] text-slate-400 mt-0.5 leading-tight">{hint}</span>}
      </span>
      <ChevronRight size={16} className="text-slate-300 shrink-0" />
    </Link>
  );
}

function Stat({ value, label }) {
  return (
    <div className="flex-1 text-center py-2.5">
      <div className="text-[17px] font-black text-slate-900 leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">{label}</div>
    </div>
  );
}

/*
 * Mobile-only account sheet, opened from the bottom tab bar.
 * Shows the signed-in user's full account details plus every account link, so
 * staff land on their panel instead of only the profile/password form.
 * Desktop is untouched — the bottom bar that renders this is lg:hidden.
 */
export default function MobileAccountSheet({ open, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const cartCount = useSelector(selectCartCount);
  const favCount = useSelector(selectFavoriteCount);

  const [details, setDetails] = useState(null);      // full profile from the API
  const [orderCount, setOrderCount] = useState(null);

  /* Stay mounted for the length of the slide-down so closing glides out
     instead of vanishing; `closing` swaps in the reverse animation. */
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); return; }
    setClosing(true);
    const t = setTimeout(() => { setMounted(false); setClosing(false); }, EXIT_MS);
    return () => clearTimeout(t);
  }, [open]);

  const isAdmin = user?.role === "admin";
  const isEmployee = user?.role === "employee";

  /* The first few sections this employee holds, in sidebar order — the sheet is
     a shortcut, not a second copy of the whole sidebar. */
  const { sections } = usePanel();
  const staffLinks = sections.flatMap((s) => s.items).slice(0, 4);

  /* Pull the complete profile + order count each time the sheet opens.
     Login only returns _id/name/email/role, so phone comes from here. */
  useEffect(() => {
    if (!open || !user) return;
    let alive = true;
    api.get("/auth/profile")
      .then(({ data }) => { if (alive) setDetails(data); })
      .catch(() => {});
    api.get("/orders/my")
      .then(({ data }) => {
        if (alive) setOrderCount(Array.isArray(data) ? data.length : (data?.orders?.length ?? 0));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [open, user]);

  /* Lock background scroll + close on Escape for as long as the sheet is up
     (through the slide-out too, so the page never jumps mid-animation) */
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mounted, onClose]);

  if (!mounted || !user) return null;

  const handleLogout = () => {
    onClose();
    dispatch(logout());
    dispatch(clearCart());
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const profile = { ...user, ...(details || {}) };

  return createPortal(
    <div className="lg:hidden fixed inset-0 z-[300]" role="dialog" aria-modal="true" aria-label="Account">
      <div
        className={`absolute inset-0 bg-black/45 backdrop-blur-[2px] ${closing ? "cg-overlay-out" : "cg-overlay-in"}`}
        onClick={onClose}
      />

      <div
        className={`absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl shadow-2xl flex flex-col ${
          closing ? "cg-sheet-out" : "cg-sheet-in"
        }`}
        style={{ maxHeight: "88vh" }}
      >

        {/* Grab handle */}
        <div className="pt-2.5 pb-1 flex justify-center shrink-0">
          <span className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close account"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 text-slate-500 border-none flex items-center justify-center cursor-pointer active:scale-95 z-10"
        >
          <X size={16} />
        </button>

        <div className="overflow-y-auto overscroll-contain" style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}>
          {/* Identity */}
          <div className="px-4 pt-3 pb-4 flex items-center gap-3.5">
            <div
              className="w-14 h-14 rounded-full text-white flex items-center justify-center shrink-0 text-xl font-black"
              style={{ background: "linear-gradient(135deg,#05618e,#0a3f59)", boxShadow: "0 6px 18px rgba(5, 97, 142,0.28)" }}
            >
              {profile.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[16px] font-black text-slate-900 m-0 truncate">{profile.name}</h2>
                {(isAdmin || isEmployee) && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
                    style={{ background: "rgba(5, 97, 142,0.09)", color: BRAND }}
                  >
                    <ShieldCheck size={10} />{" "}
                    {isAdmin
                      ? profile.adminRole || "Admin"
                      : EMPLOYEE_ROLE_LABELS[profile.employeeRole] || "Staff"}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-slate-500 m-0 mt-1 flex items-center gap-1.5 truncate">
                <Mail size={12} className="shrink-0" /> {profile.email}
              </p>
              <p className="text-[12px] text-slate-500 m-0 mt-0.5 flex items-center gap-1.5">
                <Phone size={12} className="shrink-0" />
                {profile.phone ? (
                  profile.phone
                ) : (
                  <Link to="/profile" onClick={onClose} className="no-underline font-semibold" style={{ color: BRAND }}>
                    Add phone number
                  </Link>
                )}
              </p>
            </div>
          </div>

          {/* Snapshot */}
          <div className="mx-4 mb-4 flex items-stretch rounded-2xl bg-slate-50 border border-slate-100 divide-x divide-slate-200">
            <Stat value={orderCount ?? "—"} label="Orders" />
            <Stat value={favCount} label="Wishlist" />
            <Stat value={cartCount} label="Cart" />
          </div>

          {/* Admin shortcuts — already signed in, so these go straight through */}
          {isAdmin && (
            <>
              <p className="px-4 pb-1.5 m-0 text-[10px] font-black uppercase tracking-widest text-slate-400">Admin</p>
              <div className="mx-4 mb-4 rounded-2xl border border-slate-100 overflow-hidden">
                <Row to="/admin/dashboard" icon={LayoutDashboard} label="Admin Panel" hint="Dashboard & store overview" onClose={onClose} danger />
                <Row to="/admin/orders" icon={Package} label="Manage Orders" onClose={onClose} />
                <Row to="/admin/products" icon={Boxes} label="Manage Products" onClose={onClose} />
                <Row to="/admin/users" icon={Users} label="Manage Users" onClose={onClose} />
              </div>
            </>
          )}

          {/* Staff shortcuts — the sections this employee was granted */}
          {isEmployee && (
            <>
              <p className="px-4 pb-1.5 m-0 text-[10px] font-black uppercase tracking-widest text-slate-400">Staff</p>
              <div className="mx-4 mb-4 rounded-2xl border border-slate-100 overflow-hidden">
                {staffLinks.length === 0 ? (
                  <Row to="/employee/no-access" icon={LayoutDashboard} label="Staff Panel" hint="No sections assigned yet" onClose={onClose} danger />
                ) : (
                  staffLinks.map(({ to, label, icon }, i) => (
                    <Row
                      key={to}
                      to={to}
                      icon={icon}
                      label={label}
                      hint={i === 0 ? "Your staff panel" : undefined}
                      onClose={onClose}
                      danger={i === 0}
                    />
                  ))
                )}
              </div>
            </>
          )}

          {/* Personal account */}
          <p className="px-4 pb-1.5 m-0 text-[10px] font-black uppercase tracking-widest text-slate-400">My Account</p>
          <div className="mx-4 mb-4 rounded-2xl border border-slate-100 overflow-hidden">
            <Row to="/profile" icon={UserCog} label="Profile & Password" hint="Name, phone, change password" onClose={onClose} />
            <Row to="/orders" icon={Package} label="My Orders" onClose={onClose} />
            <Row to="/replacements" icon={RefreshCcw} label="My Replacements" onClose={onClose} />
            <Row to="/favorites" icon={Heart} label="My Wishlist" onClose={onClose} />
            <Row to="/cart" icon={ShoppingCart} label="My Cart" onClose={onClose} />
            <Row to="/contact" icon={Headphones} label="Help & Support" onClose={onClose} />
          </div>

          {/* Browse — the public pages, reachable without closing the sheet first */}
          <p className="px-4 pb-1.5 m-0 text-[10px] font-black uppercase tracking-widest text-slate-400">Browse</p>
          <div className="mx-4 mb-4 rounded-2xl border border-slate-100 overflow-hidden">
            <Row to="/about" icon={Info} label="About Us" hint="Who we are & what we do" onClose={onClose} />
            <Row to="/services" icon={Sparkles} label="Our Services" hint="Graphic design & branding" onClose={onClose} />
          </div>

          <div className="px-4">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-slate-200 bg-white text-[13.5px] font-bold cursor-pointer active:scale-[0.98] transition-transform"
              style={{ color: BRAND }}
            >
              <LogOut size={16} /> Log Out
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
