import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Home, Store, SlidersHorizontal, Heart, ShoppingCart, User } from "lucide-react";
import { selectCartCount } from "../features/cart/cartSlice";
import { selectFavoriteCount } from "../features/favorites/favoritesSlice";
import MobileAccountSheet from "./MobileAccountSheet";

/* Products.jsx listens for this to open its mobile filter drawer */
export const OPEN_FILTERS_EVENT = "cg:open-mobile-filters";

const BRAND = "#05618e";

/* Auth screens — the Account tab stays lit while the user is sitting on one */
const AUTH_ROUTES = ["/login", "/register", "/forgot-password"];

function Badge({ count }) {
  if (!count) return null;
  return (
    <span
      className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-[3px] rounded-full text-white text-[9px] font-bold flex items-center justify-center leading-none"
      style={{ background: BRAND }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function Tab({ icon: Icon, label, active, badge, to, onClick, fillActive, cartTarget }) {
  const inner = (
    <>
      <span className="relative flex items-center justify-center" {...(cartTarget ? { "data-cart-target": "" } : {})}>
        <Icon size={21} strokeWidth={active ? 2.4 : 1.9} fill={active && fillActive ? BRAND : "none"} />
        <Badge count={badge} />
      </span>
      <span className={`text-[10px] leading-none tracking-wide ${active ? "font-bold" : "font-medium"}`}>
        {label}
      </span>
    </>
  );

  const cls =
    "relative flex-1 min-w-0 flex flex-col items-center justify-center gap-[5px] h-full pt-[9px] pb-[5px] bg-transparent border-none cursor-pointer no-underline select-none transition-[color,transform] duration-200 ease-out active:scale-[0.94]";
  const style = { color: active ? BRAND : "#6B7280", WebkitTapHighlightColor: "transparent" };

  return to ? (
    <Link to={to} className={cls} style={style} aria-current={active ? "page" : undefined}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls} style={style} aria-label={label}>
      {inner}
    </button>
  );
}

export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const { user } = useSelector((s) => s.auth);
  const cartCount = useSelector(selectCartCount);
  const favCount = useSelector(selectFavoriteCount);
  const [accountOpen, setAccountOpen] = useState(false);

  /* Never leave the sheet hanging over a newly opened page */
  useEffect(() => { setAccountOpen(false); }, [pathname]);

  /* The bar is deliberately never hidden: it stays on every page, signed in or
     out, so Shop / Wishlist / Cart / Account are always one tap away. */

  const onShop = pathname === "/products";
  const filterCount = ["category", "subcategory", "type", "search"].filter((k) => params.get(k)).length;

  const tabs = [
    onShop
      ? { key: "filters", icon: SlidersHorizontal, label: "Filters", badge: filterCount, active: false,
          onClick: () => window.dispatchEvent(new CustomEvent(OPEN_FILTERS_EVENT)) }
      : { key: "home", icon: Home, label: "Home", to: "/", active: pathname === "/" },
    { key: "shop", icon: Store, label: "Shop", to: "/products", active: pathname.startsWith("/products") },
    { key: "wishlist", icon: Heart, label: "Wishlist", to: "/favorites", badge: favCount, fillActive: true, active: pathname === "/favorites" },
    { key: "cart", icon: ShoppingCart, label: "Cart", to: "/cart", badge: cartCount, cartTarget: true, active: pathname === "/cart" },
    /* Signed in: open the account sheet (full details + admin shortcuts).
       Signed out: straight to login. */
    user
      ? { key: "account", icon: User, label: "Account", onClick: () => setAccountOpen(true),
          active: accountOpen || ["/profile", "/orders", "/replacements"].includes(pathname) }
      : { key: "account", icon: User, label: "Account", to: "/login", active: AUTH_ROUTES.includes(pathname) },
  ];

  return (
    <>
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-[120] flex items-stretch min-h-[64px] bg-white/95 backdrop-blur-xl border-t border-slate-200"
      style={{ paddingBottom: "env(safe-area-inset-bottom)", boxShadow: "0 -2px 18px rgba(0,0,0,0.06)" }}
      aria-label="Primary"
    >
      {tabs.map((t) => <Tab key={t.key} {...t} />)}
    </nav>

    <MobileAccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} />
    </>
  );
}
