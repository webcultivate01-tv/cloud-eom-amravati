import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const MAX_SUGGESTIONS = 6;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const IconSearch = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

/**
 * Search box with live product suggestions.
 * variant "desktop" → compact pill with a floating dropdown.
 * variant "mobile"  → full-width input (used in the drawer) with an inline list.
 * `onNavigate` fires after the user picks a suggestion or submits (e.g. to close the drawer).
 */
export default function SearchBox({ variant = "desktop", onNavigate }) {
  const navigate = useNavigate();
  const isMobile = variant === "mobile";

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [focused, setFocused] = useState(false);

  const wrapRef = useRef(null);
  const trimmed = query.trim();

  /* Debounced fetch; stale responses are ignored. */
  useEffect(() => {
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get("/products", { params: { search: escapeRegex(trimmed) } });
        if (!cancelled) {
          setResults(Array.isArray(data) ? data.slice(0, MAX_SUGGESTIONS) : []);
          setActive(-1);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [trimmed]);

  /* Close on outside click / tap. */
  useEffect(() => {
    const h = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("touchstart", h);
    };
  }, []);

  const finish = () => {
    setOpen(false);
    setQuery("");
    setResults([]);
    onNavigate?.();
  };

  const goToProduct = (p) => {
    navigate(`/products/${p._id}`);
    finish();
  };

  const submit = (e) => {
    e.preventDefault();
    if (active >= 0 && results[active]) return goToProduct(results[active]);
    if (!trimmed) return;
    navigate(`/products?search=${encodeURIComponent(trimmed)}`);
    finish();
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    }
  };

  const showPanel = open && trimmed.length > 0;

  const panel = showPanel && (
    <div
      role="listbox"
      style={{
        ...(isMobile
          ? { marginTop: 8, border: "1px solid #e5e7eb" }
          : { position: "absolute", top: "calc(100% + 8px)", left: 0, width: 340, border: "1px solid #f0f0f0", boxShadow: "0 8px 32px rgba(0,0,0,0.14)", zIndex: 300 }),
        background: "#fff",
        borderRadius: 14,
        overflow: "hidden",
        maxHeight: isMobile ? "50vh" : 420,
        overflowY: "auto",
      }}
    >
      {results.map((p, i) => {
        const img = p.images?.[0] || p.image;
        return (
          <button
            key={p._id}
            type="button"
            role="option"
            aria-selected={i === active}
            onClick={() => goToProduct(p)}
            onMouseEnter={() => setActive(i)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              padding: "10px 14px",
              border: "none",
              background: i === active ? "#eff8fd" : "#fff",
              textAlign: "left",
              cursor: "pointer",
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 8, background: "#f3f4f6", overflow: "hidden", flexShrink: 0 }}>
              {img && <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#888" }}>
                {p.category}{typeof p.price === "number" ? ` · ₹${p.price.toLocaleString()}` : ""}
              </p>
            </div>
          </button>
        );
      })}

      {!results.length && (
        <p style={{ margin: 0, padding: "14px", fontSize: 13, color: "#888", fontFamily: "'Montserrat', sans-serif" }}>
          {loading ? "Searching…" : `No products found for "${trimmed}"`}
        </p>
      )}

      {!!results.length && (
        <button
          type="submit"
          style={{
            width: "100%",
            padding: "11px 14px",
            border: "none",
            borderTop: "1px solid #f0f0f0",
            background: "#fafafa",
            color: "#0672a7",
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "'Montserrat', sans-serif",
          }}
        >
          See all results for "{trimmed}"
        </button>
      )}
    </div>
  );

  return (
    <form
      ref={wrapRef}
      onSubmit={submit}
      className={isMobile ? undefined : "desktop-search"}
      style={
        isMobile
          ? { padding: "12px 16px", borderBottom: "1px solid #f0f0f0", flexShrink: 0 }
          : { display: "none", alignItems: "center", gap: "6px", position: "relative" }
      }
    >
      <div style={{ display: "flex", gap: isMobile ? 8 : 6, alignItems: "center" }}>
        <input
          type="search"
          autoComplete="off"
          enterKeyHint="search"
          aria-label="Search products"
          placeholder="Search products..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={onKeyDown}
          onFocus={() => { setFocused(true); setOpen(true); }}
          onBlur={() => setFocused(false)}
          style={
            isMobile
              ? {
                  flex: 1, minWidth: 0,
                  border: `1.5px solid ${focused ? "#0672a7" : "#e5e7eb"}`,
                  borderRadius: 12, padding: "9px 14px",
                  fontSize: 16, /* ≥16px stops iOS zoom-on-focus */
                  outline: "none", background: "#fafafa",
                  fontFamily: "'Montserrat', sans-serif",
                }
              : {
                  width: focused ? 290 : 240,
                  border: `1.5px solid ${focused ? "#0672a7" : "#9ca3af"}`,
                  borderRadius: 22, padding: "9px 16px",
                  fontSize: "13.5px", color: "#1f2937", outline: "none",
                  fontFamily: "'Montserrat', sans-serif",
                  transition: "width 0.2s ease, border-color 0.2s ease",
                }
          }
        />
        <button
          type="submit"
          aria-label="Search"
          style={
            isMobile
              ? { background: "#0672a7", color: "#fff", border: "none", borderRadius: 12, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Montserrat', sans-serif", flexShrink: 0 }
              : { display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%", background: "#0672a7", color: "#fff", border: "none", cursor: "pointer", flexShrink: 0 }
          }
        >
          {isMobile ? "Go" : <IconSearch />}
        </button>
      </div>
      {panel}
    </form>
  );
}
