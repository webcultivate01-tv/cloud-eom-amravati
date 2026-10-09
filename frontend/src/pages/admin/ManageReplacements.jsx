import { confirmDialog } from "../../components/ConfirmDialog";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllReplacements,
  approveReplacement,
  rejectReplacement,
  processReplacement,
  completeReplacement,
  deleteReplacement,
} from "../../features/replacement/replacementSlice";
import { toast } from "react-toastify";

const STATUS_CFG = {
  pending:    { cls: "bg-amber-100 text-amber-700",   label: "Pending",    dot: "bg-amber-400" },
  approved:   { cls: "bg-sky-100 text-sky-700",       label: "Approved",   dot: "bg-sky-400" },
  rejected:   { cls: "bg-red-100 text-red-700",       label: "Rejected",   dot: "bg-red-400" },
  processing: { cls: "bg-brand-100 text-brand-700", label: "Processing", dot: "bg-brand-400" },
  completed:  { cls: "bg-emerald-100 text-emerald-700", label: "Completed",dot: "bg-emerald-400" },
};

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const shortId = (id) => id?.slice(-8).toUpperCase() || "—";

export default function ManageReplacements() {
  const dispatch = useDispatch();
  const { allReplacements, loading } = useSelector((s) => s.replacement);

  const [detailItem,    setDetailItem]    = useState(null);
  const [actionModal,   setActionModal]   = useState(null); // { rep, action }
  const [adminResponse, setAdminResponse] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus,  setFilterStatus]  = useState("all");
  const [search,         setSearch]        = useState("");

  useEffect(() => { dispatch(fetchAllReplacements()); }, [dispatch]);

  const counts = {
    total:      allReplacements.length,
    pending:    allReplacements.filter((r) => r.status === "pending").length,
    processing: allReplacements.filter((r) => r.status === "processing").length,
    completed:  allReplacements.filter((r) => r.status === "completed").length,
  };

  const visible = allReplacements.filter((r) => {
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.user?.name?.toLowerCase().includes(q) ||
      r.productName?.toLowerCase().includes(q) ||
      r.user?.email?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const ACTION_MAP = {
    approve:  { thunk: approveReplacement,  label: "Approve",       confirmLabel: "Approve Request",  cls: "text-emerald-700 bg-emerald-50 hover:bg-emerald-100", needsResponse: false },
    reject:   { thunk: rejectReplacement,   label: "Reject",        confirmLabel: "Reject Request",   cls: "text-red-600 bg-red-50 hover:bg-red-100",             needsResponse: true  },
    process:  { thunk: processReplacement,  label: "Mark Processing", confirmLabel: "Start Processing", cls: "text-brand-700 bg-brand-50 hover:bg-brand-100",   needsResponse: false },
    complete: { thunk: completeReplacement, label: "Complete",      confirmLabel: "Mark Completed",   cls: "text-emerald-700 bg-emerald-50 hover:bg-emerald-100", needsResponse: false },
  };

  const openAction = (rep, action) => { setActionModal({ rep, action }); setAdminResponse(""); };

  const handleAction = async () => {
    if (!actionModal) return;
    const { rep, action } = actionModal;
    const cfg = ACTION_MAP[action];
    if (cfg.needsResponse && !adminResponse.trim()) { toast.error("Please provide a reason for rejection"); return; }
    setActionLoading(true);
    const result = await dispatch(cfg.thunk({ id: rep._id, adminResponse }));
    setActionLoading(false);
    if (!result.error) {
      toast.success(`Request ${cfg.label.toLowerCase()}d and user notified by email`);
      setActionModal(null);
      if (detailItem?._id === rep._id) setDetailItem({ ...detailItem, status: action === "process" ? "processing" : action === "complete" ? "completed" : action + "d", adminResponse });
    } else {
      toast.error(result.payload);
    }
  };

  const handleDelete = async (id, name) => {
    if (!(await confirmDialog(`Delete replacement request by "${name}"?`))) return;
    const result = await dispatch(deleteReplacement(id));
    if (!result.error) { toast.success("Deleted"); if (detailItem?._id === id) setDetailItem(null); }
    else toast.error(result.payload);
  };

  return (
    <div className="animate-fade-in-up">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            Replacements
            {counts.pending > 0 && (
              <span className="bg-amber-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[22px] inline-flex items-center justify-center">
                {counts.pending}
              </span>
            )}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">{counts.total} total · {counts.pending} pending · {counts.processing} processing</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input className="admin-input !py-1.5 !text-sm w-44" placeholder="Search user / product…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="admin-input !py-1.5 !text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button className="admin-btn admin-btn-ghost !py-1.5 !text-sm" onClick={() => dispatch(fetchAllReplacements())}>↻ Refresh</button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total",      value: counts.total,      color: "text-slate-800", bg: "bg-slate-50" },
          { label: "Pending",    value: counts.pending,    color: "text-amber-700", bg: "bg-amber-50" },
          { label: "Processing", value: counts.processing, color: "text-brand-700", bg: "bg-brand-50" },
          { label: "Completed",  value: counts.completed,  color: "text-emerald-700", bg: "bg-emerald-50" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`admin-card p-4 ${bg}`}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-3xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
            <div className="absolute inset-0 rounded-full border-4 border-t-brand-600 animate-spin" />
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="admin-card p-16 text-center">
          <p className="text-4xl mb-3">🔄</p>
          <p className="text-slate-500 font-medium">{allReplacements.length === 0 ? "No replacement requests yet." : "No results match your filter."}</p>
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  {["User", "Order", "Product", "Status", "Delivery Date", "Submitted", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((rep) => {
                  const cfg = STATUS_CFG[rep.status] || STATUS_CFG.pending;
                  return (
                    <tr key={rep._id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 whitespace-nowrap">{rep.user?.name || "—"}</p>
                        <p className="text-xs text-slate-400">{rep.user?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs font-mono">
                        #{shortId(rep.order?._id || rep.order)}
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-[160px] truncate" title={rep.productName}>{rep.productName}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          <span className={`status-badge ${cfg.cls}`}>{cfg.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmt(rep.deliveryDate)}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmt(rep.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          <button onClick={() => setDetailItem(rep)} className="admin-btn bg-brand-50 hover:bg-brand-100 text-brand-700 !py-1 !px-2.5 !text-xs whitespace-nowrap">👁 View</button>
                          {rep.status === "pending"    && <button onClick={() => openAction(rep, "approve")}  className={`admin-btn !py-1 !px-2 !text-xs ${ACTION_MAP.approve.cls} whitespace-nowrap`}>✓ Approve</button>}
                          {rep.status === "pending"    && <button onClick={() => openAction(rep, "reject")}   className={`admin-btn !py-1 !px-2 !text-xs ${ACTION_MAP.reject.cls} whitespace-nowrap`}>✕ Reject</button>}
                          {rep.status === "approved"   && <button onClick={() => openAction(rep, "process")}  className={`admin-btn !py-1 !px-2 !text-xs ${ACTION_MAP.process.cls} whitespace-nowrap`}>⚙ Process</button>}
                          {rep.status === "processing" && <button onClick={() => openAction(rep, "complete")} className={`admin-btn !py-1 !px-2 !text-xs ${ACTION_MAP.complete.cls} whitespace-nowrap`}>🎉 Complete</button>}
                          <button onClick={() => handleDelete(rep._id, rep.user?.name)} className="admin-btn bg-red-50 hover:bg-red-100 text-red-600 !py-1 !px-2 !text-xs">🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Detail Modal ────────────────────────────────────────── */}
      {detailItem && (
        <Modal title="Replacement Request Details" onClose={() => setDetailItem(null)}>
          <div className="space-y-4">
            {/* User + Order */}
            <div className="grid grid-cols-2 gap-3">
              <InfoBox label="User"     value={detailItem.user?.name || "—"} sub={detailItem.user?.email} />
              <InfoBox label="Order ID" value={`#${shortId(detailItem.order?._id || detailItem.order)}`} />
              <InfoBox label="Product"  value={detailItem.productName} />
              <InfoBox label="Delivery" value={fmt(detailItem.deliveryDate)} />
              <InfoBox label="Submitted" value={fmt(detailItem.createdAt)} />
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                <span className={`status-badge ${(STATUS_CFG[detailItem.status] || STATUS_CFG.pending).cls}`}>
                  {(STATUS_CFG[detailItem.status] || STATUS_CFG.pending).label}
                </span>
              </div>
            </div>

            {/* Reason + Description */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Reason</p>
              <p className="text-slate-700 text-sm">{detailItem.reason}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Description</p>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                {detailItem.description}
              </div>
            </div>

            {/* Images */}
            {detailItem.images?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Evidence Images ({detailItem.images.length})</p>
                <div className="flex flex-wrap gap-2">
                  {detailItem.images.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="block">
                      <img src={url} alt={`img-${i}`} className="w-20 h-20 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity cursor-zoom-in" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Admin response */}
            {detailItem.adminResponse && (
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Admin Response</p>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-emerald-800 text-sm">{detailItem.adminResponse}</div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              {detailItem.status === "pending" && <>
                <button onClick={() => { setDetailItem(null); openAction(detailItem, "approve"); }} className="admin-btn admin-btn-primary !text-sm">✓ Approve</button>
                <button onClick={() => { setDetailItem(null); openAction(detailItem, "reject");  }} className="admin-btn bg-red-50 hover:bg-red-100 text-red-600 !text-sm">✕ Reject</button>
              </>}
              {detailItem.status === "approved"   && <button onClick={() => { setDetailItem(null); openAction(detailItem, "process");  }} className="admin-btn bg-brand-50 hover:bg-brand-100 text-brand-700 !text-sm">⚙ Mark Processing</button>}
              {detailItem.status === "processing" && <button onClick={() => { setDetailItem(null); openAction(detailItem, "complete"); }} className="admin-btn admin-btn-primary !text-sm">🎉 Mark Completed</button>}
              <button onClick={() => handleDelete(detailItem._id, detailItem.user?.name)} className="admin-btn bg-red-50 hover:bg-red-100 text-red-600 !text-sm ml-auto">🗑 Delete</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Action Confirm Modal ─────────────────────────────────── */}
      {actionModal && (
        <Modal title={ACTION_MAP[actionModal.action].confirmLabel} onClose={() => setActionModal(null)}>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1">
              <p><span className="font-semibold text-slate-500">User:</span> {actionModal.rep.user?.name} ({actionModal.rep.user?.email})</p>
              <p><span className="font-semibold text-slate-500">Product:</span> {actionModal.rep.productName}</p>
              <p><span className="font-semibold text-slate-500">Order:</span> #{shortId(actionModal.rep.order?._id || actionModal.rep.order)}</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                {ACTION_MAP[actionModal.action].needsResponse ? "Rejection Reason *" : "Message to User (optional)"}
              </label>
              <textarea
                rows={4}
                className="admin-input resize-y"
                placeholder={
                  actionModal.action === "reject"
                    ? "Explain why this request is being rejected…"
                    : "Optional message to include in the email notification…"
                }
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">
                This message will be emailed to <strong>{actionModal.rep.user?.email}</strong>.
              </p>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className="admin-btn admin-btn-primary flex-1 disabled:opacity-60"
              >
                {actionLoading ? "Processing…" : ACTION_MAP[actionModal.action].confirmLabel}
              </button>
              <button onClick={() => setActionModal(null)} className="admin-btn admin-btn-ghost">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────

function Modal({ children, title, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-card w-full max-w-xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all text-lg leading-none">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function InfoBox({ label, value, sub }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-slate-700 text-sm font-medium">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
