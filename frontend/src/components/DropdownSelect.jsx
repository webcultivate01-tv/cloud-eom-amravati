import { useEffect, useRef, useState } from "react";

/* Custom select whose option list always opens below the field (a native
   <select> lets the browser pick the direction). onChange receives an
   event-like { target: { name, value } } so existing handlers keep working. */
export default function DropdownSelect({ name, value, onChange, options, placeholder, className = "", style }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (v) => {
    onChange({ target: { name, value: v } });
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`${className} pr-10 text-left cursor-pointer ${value ? "" : "!text-slate-500"}`}
        style={style}
      >
        <span className="block truncate">{value || placeholder}</span>
      </button>
      <svg
        className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg py-1 m-0 list-none"
        >
          {options.map((opt) => (
            <li
              key={opt}
              role="option"
              aria-selected={opt === value}
              onClick={() => pick(opt)}
              className={`px-4 py-2 text-[13.5px] cursor-pointer hover:bg-slate-100 ${opt === value ? "bg-slate-50 font-bold text-slate-900" : "text-slate-700"}`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
