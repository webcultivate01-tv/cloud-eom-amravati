import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMyOrders } from "../features/orders/orderSlice";
import {
  submitReplacement,
  fetchUserReplacements,
} from "../features/replacement/replacementSlice";
import api from "../utils/api";
import { MAX_UPLOAD_MB, validateImageFile } from "../utils/uploadLimits";
import { toast } from "react-toastify";

const REPLACEMENT_WINDOW = 7;

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const shortId = (id) => id?.slice(-8).toUpperCase();
const deliveryDateOf = (order) => order.deliveredAt || order.updatedAt;

const isWindowOpen = (order) => {
  const dd = deliveryDateOf(order);
  if (!dd) return false;
  const cutoff = new Date(dd);
  cutoff.setDate(cutoff.getDate() + REPLACEMENT_WINDOW);
  return new Date() <= cutoff;
};

const daysLeft = (order) => {
  const dd = deliveryDateOf(order);
  if (!dd) return 0;
  const cutoff = new Date(dd);
  cutoff.setDate(cutoff.getDate() + REPLACEMENT_WINDOW);
  return Math.max(0, Math.ceil((cutoff - new Date()) / (1000 * 60 * 60 * 24)));
};

const STATUS = {
  pending:    { label: "Pending",    color: "#f57f17", bg: "#fff8e1" },
  approved:   { label: "Approved",   color: "#2e7d32", bg: "#f1f8e9" },
  rejected:   { label: "Rejected",   color: "#b71c1c", bg: "#ffebee" },
  processing: { label: "Processing", color: "#1565c0", bg: "#e3f2fd" },
  completed:  { label: "Completed",  color: "#1b5e20", bg: "#e8f5e9" },
};

const TIMELINE = ["pending", "approved", "processing", "completed"];

function TimelineBar({ status }) {
  const isRejected = status === "rejected";
  const activeIdx  = isRejected ? 1 : TIMELINE.indexOf(status);
  return (
    <div style={{ display: "flex", alignItems: "center", margin: "14px 0", position: "relative" }}>
      {TIMELINE.map((step, idx) => {
        const done    = !isRejected && idx <= activeIdx;
        const current = !isRejected && idx === activeIdx;
        const reject  = isRejected && step === "approved";
        return (
          <div key={step} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto" }}>
              <div style={{
                width: "24px", height: "24px", borderRadius: "50%", border: "2px solid",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.62rem", fontWeight: "700",
                background: reject ? "#ffebee" : done ? "#05618e" : "#f0f0f0",
                borderColor: reject ? "#e53935" : done ? "#05618e" : "#d0d0d0",
                color: done ? "#fff" : reject ? "#e53935" : "#999",
              }}>
                {reject ? "✕" : done ? "✓" : idx + 1}
              </div>
              <span style={{ fontSize: "0.65rem", color: current ? "#05618e" : reject ? "#e53935" : "#999", fontWeight: current ? "700" : "400", marginTop: "4px", whiteSpace: "nowrap" }}>
                {reject ? "Rejected" : step.charAt(0).toUpperCase() + step.slice(1)}
              </span>
            </div>
            {idx < TIMELINE.length - 1 && (
              <div style={{ flex: 1, height: "2px", background: !isRejected && idx < activeIdx ? "#05618e" : "#e0e0e0", margin: "0 2px 18px" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Replacements() {
  const dispatch = useDispatch();
  const { orders }                              = useSelector((s) => s.orders);
  const { userReplacements, loading: repLoading } = useSelector((s) => s.replacement);

  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState({ orderId: "", productName: "", reason: "", description: "" });
  const [errors, setErrors]         = useState({});
  const [images, setImages]         = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef                = useRef(null);

  useEffect(() => {
    dispatch(fetchMyOrders());
    dispatch(fetchUserReplacements());
  }, [dispatch]);

  // Auto-fill product name when order is selected
  useEffect(() => {
    if (!form.orderId) { setForm((f) => ({ ...f, productName: "" })); return; }
    const order = deliveredOrders.find((o) => o._id === form.orderId);
    if (order?.items?.length) setForm((f) => ({ ...f, productName: order.items[0].name }));
  }, [form.orderId]);

  const deliveredOrders = (orders || []).filter((o) => o.status === "Delivered");

  // ── Image helpers ──────────────────────────────────────────────
  const handleImagePick = (e) => {
    const picked = Array.from(e.target.files);
    if (images.length + picked.length > 5) { toast.error("Maximum 5 images allowed"); e.target.value = ""; return; }

    // Oversized files are named individually so the customer knows which photo
    // to retake, rather than being told the whole batch failed
    const files = picked.filter((file) => {
      const problem = validateImageFile(file);
      if (problem) toast.error(problem);
      return !problem;
    });
    if (!files.length) { e.target.value = ""; return; }

    setImages((prev) => [
      ...prev,
      ...files.map((file) => ({ file, preview: URL.createObjectURL(file), url: null, uploading: false })),
    ]);
    e.target.value = "";
  };

  const removeImage = (idx) => {
    setImages((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[idx].preview);
      next.splice(idx, 1);
      return next;
    });
  };

  const uploadImages = async () => {
    const results = [];
    for (let i = 0; i < images.length; i++) {
      if (images[i].url) { results.push(images[i].url); continue; }
      setImages((prev) => { const n = [...prev]; n[i] = { ...n[i], uploading: true }; return n; });
      try {
        const fd = new FormData();
        fd.append("image", images[i].file);
        const { data } = await api.post("/upload?folder=replacements", fd);
        setImages((prev) => { const n = [...prev]; n[i] = { ...n[i], url: data.imageUrl, uploading: false }; return n; });
        results.push(data.imageUrl);
      } catch {
        setImages((prev) => { const n = [...prev]; n[i] = { ...n[i], uploading: false }; return n; });
        throw new Error(`Failed to upload image ${i + 1}`);
      }
    }
    return results;
  };

  // ── Validate ───────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.orderId)              e.orderId     = "Please select an order";
    if (!form.productName.trim())   e.productName = "Product name is required";
    if (!form.reason.trim())        e.reason      = "Reason is required";
    if (!form.description.trim())   e.description = "Description is required";
    else if (form.description.trim().length < 20) e.description = "Please provide at least 20 characters";
    if (images.length === 0)        e.images      = "At least 1 image is required";
    const order = deliveredOrders.find((o) => o._id === form.orderId);
    if (order && !isWindowOpen(order)) e.orderId = "Replacement window has expired (must be within 7 days of delivery)";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const imageUrls = await uploadImages();
      const order = deliveredOrders.find((o) => o._id === form.orderId);
      const result = await dispatch(submitReplacement({
        orderId:      form.orderId,
        productName:  form.productName,
        productId:    order?.items?.[0]?.product?._id || order?.items?.[0]?.product || null,
        reason:       form.reason,
        description:  form.description,
        images:       imageUrls,
        deliveryDate: deliveryDateOf(order),
      }));
      if (!result.error) {
        toast.success("Replacement request submitted! We'll review it shortly.");
        setForm({ orderId: "", productName: "", reason: "", description: "" });
        setImages([]);
        setErrors({});
        setShowForm(false);
      } else {
        toast.error(result.payload || "Submission failed");
      }
    } catch (err) {
      toast.error(err.message || "Image upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={s.page}>

      {/* ── Page Header ─────────────────────────────────────── */}
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>Replacement Requests</h1>
          <p style={s.pageSubtitle}>
            Replacement available within <strong>7 days</strong> of delivery for manufacturing defects only. No refunds.
          </p>
        </div>
        {deliveredOrders.length > 0 && (
          <button
            onClick={() => setShowForm((v) => !v)}
            style={{ ...s.toggleBtn, ...(showForm ? s.toggleBtnCancel : {}) }}
          >
            {showForm ? "✕ Cancel" : "+ Request Replacement"}
          </button>
        )}
      </div>

      {/* ── New Request Form ─────────────────────────────────── */}
      {showForm && (
        <div style={s.formCard}>
          <h2 style={s.formTitle}>New Replacement Request</h2>
          <form onSubmit={handleSubmit} noValidate>

            {/* Order selector */}
            <div style={s.fieldGroup}>
              <label style={s.label}>Select Order *</label>
              <select
                style={{ ...s.input, ...(errors.orderId ? s.inputErr : {}) }}
                value={form.orderId}
                onChange={(e) => { setForm({ ...form, orderId: e.target.value }); setErrors({ ...errors, orderId: "" }); }}
              >
                <option value="">— Choose a delivered order —</option>
                {deliveredOrders.map((o) => {
                  const open = isWindowOpen(o);
                  const left = daysLeft(o);
                  return (
                    <option key={o._id} value={o._id} disabled={!open}>
                      #{shortId(o._id)} — {fmt(deliveryDateOf(o))}
                      {open ? ` (${left}d left)` : " (Expired)"}
                    </option>
                  );
                })}
              </select>
              {errors.orderId && <p style={s.errMsg}>{errors.orderId}</p>}
            </div>

            {/* Delivery window info */}
            {form.orderId && (() => {
              const order = deliveredOrders.find((o) => o._id === form.orderId);
              const dd    = order ? deliveryDateOf(order) : null;
              const open  = order ? isWindowOpen(order) : false;
              return (
                <div style={{ ...s.infoBox, background: open ? "#f1f8e9" : "#ffebee", borderColor: open ? "#c8e6c9" : "#ffcdd2" }}>
                  {open ? (
                    <p style={{ margin: 0, color: "#2e7d32", fontSize: "0.85rem" }}>
                      ✅ Delivered on <strong>{fmt(dd)}</strong> — {daysLeft(order)} day{daysLeft(order) !== 1 ? "s" : ""} remaining
                    </p>
                  ) : (
                    <p style={{ margin: 0, color: "#b71c1c", fontSize: "0.85rem" }}>
                      ❌ Window expired. Delivered on <strong>{fmt(dd)}</strong> (more than 7 days ago).
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Product name */}
            <div style={s.fieldGroup}>
              <label style={s.label}>Product Name *</label>
              <input
                style={{ ...s.input, ...(errors.productName ? s.inputErr : {}) }}
                placeholder="Product with defect"
                value={form.productName}
                onChange={(e) => { setForm({ ...form, productName: e.target.value }); setErrors({ ...errors, productName: "" }); }}
              />
              {errors.productName && <p style={s.errMsg}>{errors.productName}</p>}
            </div>

            {/* Reason */}
            <div style={s.fieldGroup}>
              <label style={s.label}>Reason *</label>
              <input
                style={{ ...s.input, ...(errors.reason ? s.inputErr : {}) }}
                placeholder="e.g. Manufacturing defect, damaged product"
                value={form.reason}
                onChange={(e) => { setForm({ ...form, reason: e.target.value }); setErrors({ ...errors, reason: "" }); }}
              />
              {errors.reason && <p style={s.errMsg}>{errors.reason}</p>}
            </div>

            {/* Description */}
            <div style={s.fieldGroup}>
              <label style={s.label}>
                Description * <span style={s.charHint}>({form.description.length} chars — min 20)</span>
              </label>
              <textarea
                rows={4}
                style={{ ...s.input, resize: "vertical", minHeight: "90px", ...(errors.description ? s.inputErr : {}) }}
                placeholder="Describe the defect in detail…"
                value={form.description}
                onChange={(e) => { setForm({ ...form, description: e.target.value }); setErrors({ ...errors, description: "" }); }}
              />
              {errors.description && <p style={s.errMsg}>{errors.description}</p>}
            </div>

            {/* Images */}
            <div style={s.fieldGroup}>
              <label style={s.label}>
                Upload Images * <span style={s.charHint}>({images.length}/5 — min 1)</span>
              </label>
              {images.length > 0 && (
                <div style={s.previewGrid}>
                  {images.map((img, idx) => (
                    <div key={idx} style={s.previewItem}>
                      <img src={img.preview} alt={`preview-${idx}`} style={s.previewImg} />
                      {img.uploading && (
                        <div style={s.previewOverlay}><div style={s.spinner} /></div>
                      )}
                      {!img.uploading && (
                        <button type="button" onClick={() => removeImage(idx)} style={s.removeImgBtn}>✕</button>
                      )}
                      {img.url && <div style={s.uploadedTick}>✓</div>}
                    </div>
                  ))}
                </div>
              )}
              {images.length < 5 && (
                <>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: "none" }} onChange={handleImagePick} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} style={s.uploadBtn}>
                    📷 Add Images ({images.length}/5)
                  </button>
                </>
              )}
              {errors.images && <p style={s.errMsg}>{errors.images}</p>}
              <p style={s.hint}>JPEG, PNG or WebP, up to {MAX_UPLOAD_MB} MB each. Clearly show the defect. At least 1 required.</p>
            </div>

            {/* Policy box */}
            <div style={s.policyBox}>
              <strong>📋 Policy:</strong> No refunds. Replacements only for manufacturing defects within 7 days of delivery.
            </div>

            <button
              type="submit"
              disabled={submitting || repLoading}
              style={{ ...s.submitBtn, ...(submitting || repLoading ? { opacity: 0.65, cursor: "not-allowed" } : {}) }}
            >
              {submitting ? "Uploading & Submitting…" : "Submit Replacement Request"}
            </button>
          </form>
        </div>
      )}

      {/* ── No delivered orders state ─────────────────────────── */}
      {deliveredOrders.length === 0 && userReplacements.length === 0 && (
        <div style={s.emptyBox}>
          <p style={s.emptyText}>
            You have no delivered orders yet. Replacements can only be requested for delivered orders within 7 days.
          </p>
        </div>
      )}

      {/* ── My Requests List ─────────────────────────────────── */}
      {userReplacements.length > 0 && (
        <div style={s.listSection}>
          <h2 style={s.listTitle}>My Requests</h2>
          <div style={s.list}>
            {userReplacements.map((rep) => {
              const cfg = STATUS[rep.status] || STATUS.pending;
              return (
                <div key={rep._id} style={s.card}>
                  {/* Card header */}
                  <div style={s.cardHeader}>
                    <div>
                      <p style={s.cardProduct}>{rep.productName}</p>
                      <p style={s.cardMeta}>
                        Order #{shortId(rep.order?._id || rep.order)} &nbsp;·&nbsp; Submitted {fmt(rep.createdAt)}
                      </p>
                    </div>
                    <span style={{ ...s.badge, color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                  </div>

                  {/* Timeline */}
                  <TimelineBar status={rep.status} />

                  {/* Details */}
                  <div style={s.cardDetails}>
                    <div style={s.detailRow}>
                      <span style={s.detailLabel}>Reason</span>
                      <span style={s.detailVal}>{rep.reason}</span>
                    </div>
                    <div style={s.detailRow}>
                      <span style={s.detailLabel}>Description</span>
                      <span style={s.detailVal}>{rep.description}</span>
                    </div>
                    {rep.deliveryDate && (
                      <div style={s.detailRow}>
                        <span style={s.detailLabel}>Delivery Date</span>
                        <span style={s.detailVal}>{fmt(rep.deliveryDate)}</span>
                      </div>
                    )}
                  </div>

                  {/* Evidence images */}
                  {rep.images?.length > 0 && (
                    <div style={s.imgRow}>
                      {rep.images.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt={`evidence-${i}`} style={s.thumb} />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Admin response */}
                  {rep.adminResponse && (
                    <div style={s.adminBox}>
                      <p style={s.detailLabel}>Response from Team</p>
                      <p style={{ ...s.detailVal, color: "#1a1a1a", marginTop: "4px" }}>{rep.adminResponse}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page:        { background: "#f7f7f7", minHeight: "80vh", padding: "40px 16px 60px", maxWidth: "820px", margin: "0 auto" },

  // Header
  pageHeader:  { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", gap: "12px", flexWrap: "wrap" },
  pageTitle:   { fontSize: "1.6rem", fontWeight: "800", color: "#1a1a1a", margin: "0 0 6px" },
  pageSubtitle:{ color: "#888", fontSize: "0.88rem", lineHeight: "1.5", margin: 0 },
  toggleBtn:       { background: "#05618e", color: "#fff", border: "none", borderRadius: "8px", padding: "11px 22px", fontSize: "0.9rem", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap" },
  toggleBtnCancel: { background: "#e0e0e0", color: "#555" },

  // Form card
  formCard:    { background: "#fff", borderRadius: "14px", border: "1px solid #e0e0e0", padding: "32px 36px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: "28px" },
  formTitle:   { fontSize: "1.05rem", fontWeight: "800", color: "#1a1a1a", marginBottom: "22px" },
  fieldGroup:  { marginBottom: "18px" },
  label:       { display: "block", color: "#555", fontSize: "0.82rem", fontWeight: "600", marginBottom: "6px" },
  charHint:    { fontWeight: "400", color: "#aaa" },
  input:       { width: "100%", padding: "11px 14px", border: "1px solid #e0e0e0", borderRadius: "8px", fontSize: "0.9rem", background: "#fafafa", boxSizing: "border-box", outline: "none", fontFamily: "inherit" },
  inputErr:    { borderColor: "#e53935", background: "#fff9f9" },
  errMsg:      { color: "#e53935", fontSize: "0.77rem", fontWeight: "600", marginTop: "4px" },
  hint:        { color: "#aaa", fontSize: "0.76rem", marginTop: "4px" },
  infoBox:     { border: "1px solid", borderRadius: "8px", padding: "12px 14px", marginBottom: "16px" },
  policyBox:   { background: "#fff8e1", border: "1px solid #ffe082", borderRadius: "8px", padding: "12px 14px", fontSize: "0.83rem", color: "#555", marginBottom: "20px" },

  // Image upload
  previewGrid:   { display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "10px" },
  previewItem:   { position: "relative", width: "84px", height: "84px", borderRadius: "8px", overflow: "hidden", border: "1px solid #e0e0e0" },
  previewImg:    { width: "100%", height: "100%", objectFit: "cover" },
  previewOverlay:{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.75)", display: "flex", alignItems: "center", justifyContent: "center" },
  spinner:       { width: "22px", height: "22px", border: "3px solid #e0e0e0", borderTopColor: "#05618e", borderRadius: "50%" },
  removeImgBtn:  { position: "absolute", top: "3px", right: "3px", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: "18px", height: "18px", fontSize: "0.6rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  uploadedTick:  { position: "absolute", bottom: "3px", right: "3px", background: "#2e7d32", color: "#fff", borderRadius: "50%", width: "16px", height: "16px", fontSize: "0.6rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700" },
  uploadBtn:     { border: "2px dashed #05618e", background: "#eff8fd", color: "#05618e", borderRadius: "8px", padding: "9px 18px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600" },
  submitBtn:     { background: "#05618e", color: "#fff", border: "none", borderRadius: "8px", padding: "13px 36px", fontWeight: "700", fontSize: "0.95rem", cursor: "pointer" },

  // Empty state
  emptyBox:    { background: "#fff", borderRadius: "14px", border: "1px solid #e0e0e0", padding: "48px 32px", textAlign: "center" },
  emptyText:   { color: "#999", fontSize: "0.95rem", margin: 0 },

  // Request list
  listSection: { marginTop: "8px" },
  listTitle:   { fontSize: "1rem", fontWeight: "800", color: "#1a1a1a", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "16px" },
  list:        { display: "flex", flexDirection: "column", gap: "16px" },
  card:        { background: "#fff", border: "1px solid #e8e8e8", borderRadius: "14px", padding: "22px 24px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" },
  cardHeader:  { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "4px" },
  cardProduct: { fontWeight: "700", color: "#1a1a1a", fontSize: "1rem", margin: 0 },
  cardMeta:    { color: "#999", fontSize: "0.78rem", marginTop: "3px" },
  badge:       { padding: "4px 12px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "700", whiteSpace: "nowrap" },
  cardDetails: { fontSize: "0.87rem", lineHeight: "1.6", marginTop: "8px" },
  detailRow:   { display: "flex", gap: "10px", marginBottom: "4px", flexWrap: "wrap" },
  detailLabel: { color: "#aaa", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.4px", flexShrink: 0, paddingTop: "2px" },
  detailVal:   { color: "#555", margin: 0 },
  imgRow:      { display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" },
  thumb:       { width: "64px", height: "64px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e0e0e0", cursor: "pointer" },
  adminBox:    { marginTop: "14px", padding: "12px 14px", background: "#f1f8e9", borderLeft: "3px solid #2e7d32", borderRadius: "6px" },
};
