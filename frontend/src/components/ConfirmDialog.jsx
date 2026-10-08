import { useEffect, useState, useCallback } from "react";

/* In-site replacement for window.confirm().
   Usage:  if (!(await confirmDialog("Delete this?"))) return;
   Mount <ConfirmHost /> once (see App.jsx). */

let openDialog = null;

export function confirmDialog(options) {
  const opts = typeof options === "string" ? { message: options } : options;
  if (!openDialog) return Promise.resolve(window.confirm(opts.message)); // host not mounted
  return new Promise((resolve) => openDialog({ ...opts, resolve }));
}

export default function ConfirmHost() {
  const [dlg, setDlg] = useState(null);

  useEffect(() => {
    openDialog = setDlg;
    return () => { openDialog = null; };
  }, []);

  const close = useCallback((result) => {
    setDlg((d) => {
      d?.resolve(result);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!dlg) return;
    const onKey = (e) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dlg, close]);

  if (!dlg) return null;

  const danger = dlg.danger !== false;

  return (
    <div
      onClick={() => close(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 10000, display: "flex",
        alignItems: "center", justifyContent: "center", padding: 16,
        background: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(2px)",
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cg-confirm-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 400, background: "#fff", borderRadius: 14,
          padding: "24px 22px 18px", boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
          fontFamily: "inherit",
        }}
      >
        <h3 id="cg-confirm-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
          {dlg.title || "Are you sure?"}
        </h3>
        <p style={{ margin: "10px 0 20px", fontSize: 14, lineHeight: 1.5, color: "#475569" }}>
          {dlg.message}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="button"
            onClick={() => close(false)}
            style={{
              padding: "8px 18px", borderRadius: 8, border: "1px solid #cbd5e1",
              background: "#fff", color: "#334155", fontWeight: 600, cursor: "pointer",
            }}
          >
            {dlg.cancelText || "Cancel"}
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => close(true)}
            style={{
              padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
              background: danger ? "#dc2626" : "#0f3460", color: "#fff", fontWeight: 600,
            }}
          >
            {dlg.confirmText || (danger ? "Delete" : "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
