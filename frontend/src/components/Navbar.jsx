import { useState, useEffect, useRef } from "react";
import logoImg from "../assets/logo.png";

/* ── Google Fonts ── */
const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@800;900&family=Montserrat:wght@500;600;700&display=swap";
fontLink.rel = "stylesheet";
if (!document.head.querySelector("[href*='Playfair+Display']")) document.head.appendChild(fontLink);

import { Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../features/auth/authSlice";
import { clearCart, selectCartCount } from "../features/cart/cartSlice";
import { selectFavoriteCount } from "../features/favorites/favoritesSlice";
import { toast } from "react-toastify";
import SearchBox from "./SearchBox";

const PROMO_CATEGORIES = ["Sale", "New Arrivals"];
const PRODUCT_CATEGORIES = ["Cup", "T-Shirt", "Diary", "Pen", "ID Card", "Frame", "Keychain", "Banner"].sort((a, b) => a.localeCompare(b));
const CATEGORIES = [...PROMO_CATEGORIES, ...PRODUCT_CATEGORIES];

/* Standalone pages pinned to the end of the desktop category bar */
const PAGE_LINKS = [
  { label: "About", to: "/about" },
  { label: "Services", to: "/services" },
  { label: "Contact Us", to: "/contact" },
];

const OFFERS = [
  "Get EXTRA 10% OFF On Orders Above ₹1299 | Code: MEGA10",
  "Get EXTRA 15% OFF On Orders Above ₹1699 | Code: MEGA15",
  "Free Delivery On All Orders Above ₹299",
  "Custom Printing On All Products — Upload Your Design!",
];

/* ── SVG Icons ── */
const IconSearch = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconHeart = ({ filled }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "#0672a7" : "none"} stroke={filled ? "#0672a7" : "currentColor"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const IconCart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);
const IconUser = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconMenu = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const IconX = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconPackage = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);
const IconRefresh = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);
const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);
const IconChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const IconInfo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);
const IconHome = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>
  </svg>
);
const IconGrid = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>
  </svg>
);
const IconSparkle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/>
    <path d="M18 15.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z"/>
  </svg>
);
const IconMailSm = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,7 12,13 2,7"/>
  </svg>
);
const IconArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

/* ── Inline styles ── */
const styles = `
  .nav-link-underline {
    position: relative;
    display: inline-block;
  }
  .nav-link-underline::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0; right: 0;
    height: 2px;
    background: #0672a7;
    transform: scaleX(0);
    transform-origin: center;
    transition: transform 0.2s ease;
  }
  .nav-link-underline:hover::after,
  .nav-link-underline.active::after {
    transform: scaleX(1);
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    color: #333;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    position: relative;
    background: none;
    border: none;
    padding: 0;
    text-decoration: none;
  }
  .icon-btn:hover { background: #eff8fd; color: #0672a7; }

  .badge {
    position: absolute;
    top: 2px;
    right: 2px;
    min-width: 17px;
    height: 17px;
    background: #0672a7;
    color: #fff;
    border-radius: 50%;
    font-size: 9px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    padding: 0 2px;
    pointer-events: none;
  }

  /* The logo is the stacked lockup — mark over wordmark — so the row has to be
     tall enough for "CLOUD GRAPHICS" underneath the cloud to still read. */
  .nav-row { height: 62px; }
  .nav-logo { height: 50px; }

  .drawer-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    z-index: 9998;
    transition: opacity 0.25s;
  }
  .drawer {
    position: fixed;
    top: 0; left: 0; bottom: 0;
    width: min(300px, 85vw);
    background: #fff;
    z-index: 9999;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    box-shadow: 4px 0 24px rgba(0,0,0,0.15);
    transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
  }

`;

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((s) => s.auth);
  const cartCount = useSelector(selectCartCount);
  const favCount = useSelector(selectFavoriteCount);

  const [mobileDrawer, setMobileDrawer] = useState(false);
  const [drawerAccountOpen, setDrawerAccountOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [offerIndex, setOfferIndex] = useState(0);
  const [offerVisible, setOfferVisible] = useState(true);

  const drawerRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Offer ticker: fade out → change text → fade in every 3s ── */
  useEffect(() => {
    const interval = setInterval(() => {
      setOfferVisible(false);
      setTimeout(() => {
        setOfferIndex((prev) => (prev + 1) % OFFERS.length);
        setOfferVisible(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setMobileDrawer(false);
    setUserMenu(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.style.overflow = mobileDrawer ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileDrawer]);

  useEffect(() => {
    if (!userMenu) return;
    const h = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [userMenu]);

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearCart());
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const catQuery = (cat) =>
    cat === "Sale" ? "?sale=true" : cat === "New Arrivals" ? "?sort=newest" : `?category=${cat}`;
  const catActive = (cat) =>
    location.search.includes(cat) || (cat === "Sale" && location.search.includes("sale"));

  return (
    <>
      <style>{styles}</style>

      <header
        data-site-nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#fff",
          boxShadow: scrolled ? "0 2px 12px rgba(0,0,0,0.10)" : "0 1px 0 #e5e7eb",
          transition: "box-shadow 0.3s",
        }}
      >

        {/* ── Offer Ticker Bar ── */}
        <div style={{ background: "#0672a7", padding: "7px 0", overflow: "hidden" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "18px",
          }}>
            <span
              style={{
                color: "#fff",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                whiteSpace: "nowrap",
                fontFamily: "'Montserrat', sans-serif",
                opacity: offerVisible ? 1 : 0,
                transition: "opacity 0.4s ease",
                textAlign: "center",
              }}
            >
              {OFFERS[offerIndex]}
            </span>
          </div>
        </div>

        {/* ── Main Nav Row ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            maxWidth: "1280px",
            margin: "0 auto",
            width: "100%",
            boxSizing: "border-box",
            position: "relative",
          }}
          className="nav-row"
        >

          {/* LEFT — Hamburger (mobile) + Search (desktop) */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1, minWidth: 0 }}>

            {/* Hamburger — mobile/tablet only */}
            <button
              className="icon-btn hamburger-btn"
              style={{ borderRadius: "8px", width: 38, height: 38 }}
              onClick={() => { setDrawerAccountOpen(false); setMobileDrawer(true); }}
              aria-label="Open menu"
            >
              <IconMenu />
            </button>

            {/* Search — desktop: compact box with live suggestions */}
            <SearchBox variant="desktop" />
          </div>

          {/* CENTER — Logo (absolutely centered) */}
          <Link
            to="/"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexShrink: 0,
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            <img className="nav-logo" src={logoImg} alt="Cloud Graphics — Visual Solution For Your Business" style={{ width: "auto", display: "block" }} />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "2px", flex: 1, justifyContent: "flex-end" }}>

            {/* Search icon — mobile */}
            <button
              className="icon-btn mobile-search-btn"
              onClick={() => {
                setDrawerAccountOpen(false);
                setMobileDrawer(true);
                // Open drawer, focus search
              }}
              aria-label="Search"
            >
              <IconSearch />
            </button>

            {/* Wishlist */}
            <Link to="/favorites" className="icon-btn desktop-icon" aria-label="Wishlist">
              <IconHeart filled={favCount > 0} />
              {favCount > 0 && <span className="badge">{favCount}</span>}
            </Link>

            {/* Cart */}
            <Link to="/cart" className="icon-btn desktop-icon" aria-label="Cart" data-cart-target>
              <IconCart />
              {cartCount > 0 && <span className="badge">{cartCount}</span>}
            </Link>



            {/* User (desktop) / hidden on mobile as user goes in drawer */}
            {user ? (
              <div style={{ position: "relative" }} ref={userMenuRef} className="desktop-user">
                <button
                  onClick={() => setUserMenu(!userMenu)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#eff8fd",
                    border: "1px solid #b0def4",
                    borderRadius: "24px",
                    padding: "4px 10px 4px 4px",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      background: "#0672a7",
                      borderRadius: "50%",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 12,
                      fontFamily: "'Montserrat', sans-serif",
                    }}
                  >
                    {user.name?.[0]?.toUpperCase()}
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#333",
                      maxWidth: 70,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontFamily: "'Montserrat', sans-serif",
                    }}
                  >
                    {user.name.split(" ")[0]}
                  </span>
                </button>

                {userMenu && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      background: "#fff",
                      border: "1px solid #f0f0f0",
                      borderRadius: "16px",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                      minWidth: 200,
                      zIndex: 200,
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid #f5f5f5" }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#111", fontFamily: "'Montserrat', sans-serif" }}>{user.name}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#888" }}>{user.email}</p>
                    </div>
                    {[
                      user.role === "admin" && { to: "/admin/dashboard", icon: <IconDashboard />, label: "Admin Panel" },
                      { to: "/profile", icon: <IconUser />, label: "My Profile" },
                      { to: "/favorites", icon: <IconHeart />, label: "My Favourites" },
                      { to: "/orders", icon: <IconPackage />, label: "My Orders" },
                      { to: "/replacements", icon: <IconRefresh />, label: "My Replacements" },
                    ].filter(Boolean).map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setUserMenu(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 16px",
                          textDecoration: "none",
                          color: "#333",
                          fontSize: 13,
                          fontFamily: "'Montserrat', sans-serif",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#eff8fd"; e.currentTarget.style.color = "#0672a7"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "#333"; }}
                      >
                        {item.icon} {item.label}
                      </Link>
                    ))}
                    <div style={{ borderTop: "1px solid #f5f5f5" }}>
                      <button
                        onClick={handleLogout}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          width: "100%",
                          textAlign: "left",
                          padding: "10px 16px",
                          border: "none",
                          background: "none",
                          color: "#0672a7",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "'Montserrat', sans-serif",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#eff8fd"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                      >
                        <IconLogout /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 6, marginLeft: 4 }} className="desktop-auth">
                <Link
                  to="/login"
                  style={{
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#333",
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontFamily: "'Montserrat', sans-serif",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#0672a7"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#333"; }}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  style={{
                    textDecoration: "none",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#fff",
                    padding: "6px 14px",
                    borderRadius: 20,
                    background: "#0672a7",
                    fontFamily: "'Montserrat', sans-serif",
                    whiteSpace: "nowrap",
                  }}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── Category Bar — desktop only ── */}
        <nav
          className="desktop-categories"
          style={{
            display: "none",
            justifyContent: "center",
            borderTop: "1px solid #c8c8c8",
            overflowX: "auto",
            padding: "0 16px",
          }}
        >
          {[...CATEGORIES, ...PAGE_LINKS.map((p) => p.label)].map((cat, i) => {
            /* Everything past the categories is a standalone page, not a filtered
               product listing — About / Services / Contact Us live here. */
            const page = PAGE_LINKS[i - CATEGORIES.length];
            const to = page ? page.to : `/products${catQuery(cat)}`;
            const active = page ? location.pathname === page.to : catActive(cat);
            return (
              <Link
                key={cat}
                to={to}
                className={`nav-link-underline${active ? " active" : ""}`}
                style={{
                  textDecoration: "none",
                  padding: "13px 20px 15px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  letterSpacing: "0.5px",
                  color: active ? "#0672a7" : "#4B5563",
                  whiteSpace: "nowrap",
                  fontFamily: "'Montserrat', sans-serif",
                  textTransform: "uppercase",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "#0672a7"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "#4B5563"; }}
              >
                {cat.toUpperCase()}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* ── Responsive styles ── */}
      <style>{`
        @media (min-width: 1024px) {
          .nav-row { height: 76px; }
          .nav-logo { height: 62px; }
          .desktop-search { display: flex !important; }
          .desktop-categories { display: flex !important; }
          .desktop-user { display: block !important; }
          .desktop-auth { display: flex !important; }
          .mobile-search-btn { display: none !important; }
          .hamburger-btn { display: none !important; }
        }
        @media (max-width: 1023px) {
          .desktop-user { display: none !important; }
          .desktop-auth { display: none !important; }
          .desktop-categories { display: none !important; }
          /* Wishlist + Cart live in the mobile bottom tab bar instead */
          .desktop-icon { display: none !important; }
        }
      `}</style>

      {/* ── Mobile Drawer ── */}
      {mobileDrawer && (
        <div
          className="drawer-overlay"
          onClick={() => setMobileDrawer(false)}
        />
      )}

      <div
        ref={drawerRef}
        className="drawer"
        style={{ transform: mobileDrawer ? "translateX(0)" : "translateX(-100%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 18px",
            borderBottom: "1px solid #f0f0f0",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={logoImg} alt="Cloud Graphics — Visual Solution For Your Business" style={{ height: 52, width: "auto" }} />
          </div>
          <button
            onClick={() => setMobileDrawer(false)}
            className="icon-btn"
            style={{ width: 34, height: 34, borderRadius: 8 }}
          >
            <IconX />
          </button>
        </div>

        {/* Mobile Search */}
        <SearchBox variant="mobile" onNavigate={() => setMobileDrawer(false)} />

        {/* Pages */}
        <div style={{ borderBottom: "1px solid #f0f0f0" }}>
          <p style={{
            margin: 0,
            padding: "12px 18px 6px",
            fontSize: 10,
            fontWeight: 700,
            color: "#aaa",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            fontFamily: "'Montserrat', sans-serif",
          }}>
            Pages
          </p>
          {[
            { to: "/", icon: <IconHome />, label: "Home" },
            { to: "/products", icon: <IconGrid />, label: "Products" },
            { to: "/about", icon: <IconInfo />, label: "About" },
            { to: "/services", icon: <IconSparkle />, label: "Services" },
            { to: "/contact", icon: <IconMailSm />, label: "Contact" },
          ].map((item) => {
            const active = item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 18px",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  color: active ? "#0672a7" : "#333",
                  background: active ? "#eff8fd" : "transparent",
                  fontFamily: "'Montserrat', sans-serif",
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#eff8fd"; e.currentTarget.style.color = "#0672a7"; }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#333"; } }}
              >
                {item.icon} {item.label}
              </Link>
            );
          })}
        </div>

        {/* Account section */}
        <div style={{ flex: 1 }}>
          {user ? (
            <>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                margin: "8px 14px",
                padding: "12px",
                background: "#eff8fd",
                borderRadius: 12,
              }}>
                <div style={{
                  width: 40, height: 40,
                  background: "#0672a7",
                  borderRadius: "50%",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 16,
                  flexShrink: 0,
                  fontFamily: "'Montserrat', sans-serif",
                }}>
                  {user.name?.[0]?.toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#111", fontFamily: "'Montserrat', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
                </div>
              </div>

              {/* Account — collapsible group */}
              <button
                onClick={() => setDrawerAccountOpen((v) => !v)}
                aria-expanded={drawerAccountOpen}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  textAlign: "left",
                  padding: "11px 18px",
                  border: "none",
                  background: drawerAccountOpen ? "#eff8fd" : "none",
                  color: drawerAccountOpen ? "#0672a7" : "#333",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Montserrat', sans-serif",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                <IconUser />
                <span style={{ flex: 1 }}>Account</span>
                <span style={{
                  display: "flex",
                  transform: drawerAccountOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}>
                  <IconChevronDown />
                </span>
              </button>

              {drawerAccountOpen && (
                <div style={{ background: "#fafafa", borderTop: "1px solid #f0f0f0", borderBottom: "1px solid #f0f0f0" }}>
                  {[
                    user.role === "admin" && { to: "/admin/dashboard", icon: <IconDashboard />, label: "Admin Panel" },
                    { to: "/profile", icon: <IconUser />, label: "My Profile" },
                    { to: "/orders", icon: <IconPackage />, label: "My Orders" },
                    { to: "/favorites", icon: <IconHeart />, label: "My Favourites" },
                    { to: "/replacements", icon: <IconRefresh />, label: "My Replacements" },
                  ].filter(Boolean).map((item) => {
                    const active = location.pathname === item.to;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "11px 18px 11px 32px",
                          textDecoration: "none",
                          color: active ? "#0672a7" : "#333",
                          background: active ? "#eff8fd" : "transparent",
                          fontSize: 13,
                          fontFamily: "'Montserrat', sans-serif",
                          transition: "background 0.15s, color 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#eff8fd"; e.currentTarget.style.color = "#0672a7"; }}
                        onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#333"; } }}
                      >
                        {item.icon} {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}

              <div style={{ borderTop: "1px solid #f0f0f0", marginTop: 4 }}>
                <button
                  onClick={handleLogout}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    textAlign: "left",
                    padding: "11px 18px",
                    border: "none",
                    background: "none",
                    color: "#0672a7",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "'Montserrat', sans-serif",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#eff8fd"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                >
                  <IconLogout /> Logout
                </button>
              </div>
            </>
          ) : (
            /* Guest — sign in card */
            <div style={{
              margin: "14px",
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid #c9e5f5",
              background: "linear-gradient(160deg, #f4fafd 0%, #ffffff 70%)",
            }}>
              <div style={{ padding: "18px 16px 16px", textAlign: "center" }}>
                <div style={{
                  width: 44,
                  height: 44,
                  margin: "0 auto 10px",
                  borderRadius: "50%",
                  background: "#0672a7",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 14px rgba(6, 114, 167,0.32)",
                }}>
                  <IconUser />
                </div>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#111",
                  fontFamily: "'Montserrat', sans-serif",
                }}>
                  Welcome to Cloud Graphics
                </p>
                <p style={{
                  margin: "5px 0 14px",
                  fontSize: 11.5,
                  lineHeight: 1.5,
                  color: "#8a8a8a",
                  fontFamily: "'Montserrat', sans-serif",
                }}>
                  Sign in to track orders, save favourites and reorder in a tap.
                </p>

                <Link
                  to="/login"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "12px",
                    background: "#0672a7",
                    borderRadius: 12,
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: "none",
                    fontFamily: "'Montserrat', sans-serif",
                    boxShadow: "0 4px 14px rgba(6, 114, 167,0.3)",
                  }}
                >
                  Sign In <IconArrowRight />
                </Link>
              </div>

              <div style={{
                borderTop: "1px solid #c9e5f5",
                padding: "11px 16px",
                textAlign: "center",
                background: "rgba(255,255,255,0.6)",
              }}>
                <span style={{ fontSize: 11.5, color: "#8a8a8a", fontFamily: "'Montserrat', sans-serif" }}>
                  New here?{" "}
                </span>
                <Link
                  to="/register"
                  style={{
                    fontSize: 11.5,
                    fontWeight: 800,
                    color: "#0672a7",
                    textDecoration: "none",
                    fontFamily: "'Montserrat', sans-serif",
                  }}
                >
                  Create an account
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
