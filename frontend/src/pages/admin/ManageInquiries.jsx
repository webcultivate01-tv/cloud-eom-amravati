import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllInquiries,
  deleteInquiry,
  respondToInquiry,
  updateInquiryStatus,
} from "../../features/inquiry/inquirySlice";
import { toast } from "react-toastify";
import {
  Mail, Search, Trash2, Eye, Send, RotateCw, X,
  Filter, Phone, StickyNote, ChevronDown, CheckCircle2, XCircle,
} from "lucide-react";

/* ── Pipeline ──────────────────────────────────────────────────
   Same order and same keys as INQUIRY_STATUSES in backend/models/Inquiry.js —
   an enquiry walks left to right, ending at Won or Lost. `cls` is the badge,
   `dot` the swatch used in the picker and the summary strip. */
const STATUSES = [
  { key: "pending",     label: "New",         cls: "bg-slate-100 text-slate-700",     dot: "bg-slate-400",   hint: "Just came in — nobody has picked it up yet" },
  { key: "contacted",   label: "Contacted",   cls: "bg-sky-100 text-sky-700",         dot: "bg-sky-500",     hint: "Called or emailed the customer back" },
  { key: "visited",     label: "Visited",     cls: "bg-indigo-100 text-indigo-700",   dot: "bg-indigo-500",  hint: "Customer came to the shop, or we visited them" },
  { key: "not_visited", label: "Not Visited", cls: "bg-orange-100 text-orange-700",   dot: "bg-orange-500",  hint: "Appointment made but they never turned up" },
  { key: "quoted",      label: "Quoted",      cls: "bg-violet-100 text-violet-700",   dot: "bg-violet-500",  hint: "A price has been sent" },
  { key: "won",         label: "Won",         cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", hint: "Converted into an order" },
  { key: "lost",        label: "Lost",        cls: "bg-rose-100 text-rose-700",       dot: "bg-rose-500",    hint: "Went cold, or went elsewhere" },
];

const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.key, s]));
const statusOf = (inq) => STATUS_MAP[inq?.status] || STATUSES[0];

/* Quick date presets — the ranges an admin actually asks for, expressed as
   "how many days back from today". null means the range starts at the epoch. */
const DATE_PRESETS = [
  { key: "all",   label: "All time", days: null },
  { key: "today", label: "Today",    days: 0 },
  { key: "7d",    label: "Last 7 days",  days: 6 },
  { key: "30d",   label: "Last 30 days", days: 29 },
  { key: "custom", label: "Custom range", days: undefined },
];

/* <input type="date"> speaks YYYY-MM-DD in local time; Date#toISOString would
   hand back UTC and shift the day for anyone east of Greenwich. */
const toInputDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toInputDate(d);
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const fmtDateTime = (d) =>
  new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function ManageInquiries() {
  const dispatch = useDispatch();
  const { inquiries, loading } = useSelector((s) => s.inquiry);

  const [detailInq, setDetailInq] = useState(null);
  const [respondInq, setRespondInq] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [responding, setResponding] = useState(false);
  const [savingId, setSavingId] = useState(null);

  /* Filters */
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [datePreset, setDatePreset] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => { dispatch(fetchAllInquiries()); }, [dispatch]);

  /* Arriving from the bell (?inquiry=<id>): open that enquiry's details. */
  const [searchParams, setSearchParams] = useSearchParams();
  const targetId = searchParams.get("inquiry");
  useEffect(() => {
    if (!targetId) return;
    const found = inquiries.find((q) => q._id === targetId);
    if (!found) return;
    setDetailInq(found);
    setSearchParams({}, { replace: true });
  }, [targetId, inquiries, setSearchParams]);

  /* Picking a preset fills the two date boxes, so the custom range always shows
     what is actually being filtered on rather than sitting empty behind it. */
  const applyPreset = (key) => {
    setDatePreset(key);
    const preset = DATE_PRESETS.find((p) => p.key === key);
    if (!preset || preset.days === undefined) return;   // custom — leave as typed
    if (preset.days === null) { setFromDate(""); setToDate(""); return; }
    setFromDate(daysAgo(preset.days));
    setToDate(toInputDate(new Date()));
  };

  const onDateEdit = (which, value) => {
    if (which === "from") setFromDate(value); else setToDate(value);
    setDatePreset("custom");
  };

  const resetFilters = () => {
    setSearch(""); setFilterStatus("all"); setDatePreset("all");
    setFromDate(""); setToDate("");
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete the enquiry from "${name}"? This cannot be undone.`)) return;
    const result = await dispatch(deleteInquiry(id));
    if (!result.error) toast.success("Enquiry deleted");
    else toast.error(result.payload);
    if (detailInq?._id === id) setDetailInq(null);
  };

  const handleStatusChange = async (inq, status) => {
    if (inq.status === status) return;
    setSavingId(inq._id);
    const result = await dispatch(updateInquiryStatus({ id: inq._id, status }));
    setSavingId(null);
    if (result.error) { toast.error(result.payload); return; }
    toast.success(`Marked as ${STATUS_MAP[status].label}`);
    if (detailInq?._id === inq._id) setDetailInq(result.payload);
  };

  const handleNotesSave = async (inq, notes) => {
    setSavingId(inq._id);
    const result = await dispatch(updateInquiryStatus({ id: inq._id, notes }));
    setSavingId(null);
    if (result.error) { toast.error(result.payload); return; }
    toast.success("Notes saved");
    if (detailInq?._id === inq._id) setDetailInq(result.payload);
  };

  const openRespond = (inq) => {
    setRespondInq(inq);
    setResponseText(inq.adminResponse || "");
  };

  const handleRespond = async () => {
    if (!responseText.trim()) { toast.error("The reply cannot be empty"); return; }
    setResponding(true);
    const result = await dispatch(respondToInquiry({ id: respondInq._id, adminResponse: responseText }));
    setResponding(false);
    if (result.error) { toast.error(result.payload); return; }
    toast.success("Reply emailed to the customer");
    if (detailInq?._id === respondInq._id) setDetailInq(result.payload);
    setRespondInq(null);
    setResponseText("");
  };

  /* ── Filtering ──────────────────────────────────────────────
     Done here rather than on the server: the whole list is already loaded, so
     typing in the search box or dragging a date filters instantly with no
     round trip. The same filters exist on GET /api/inquiry for exports. */
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Dates are compared inclusively, so "to = today" includes today's enquiries
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;

    return inquiries.filter((inq) => {
      if (filterStatus !== "all" && inq.status !== filterStatus) return false;

      const created = new Date(inq.createdAt);
      if (from && created < from) return false;
      if (to && created > to) return false;

      if (!q) return true;
      return [inq.name, inq.email, inq.phone, inq.subject, inq.message]
        .some((field) => String(field || "").toLowerCase().includes(q));
    });
  }, [inquiries, search, filterStatus, fromDate, toDate]);

  /* Counts come from the full list, not the filtered one — the strip is how the
     admin sees where the pipeline stands, and doubles as the status filter. */
  const counts = useMemo(() => {
    const base = Object.fromEntries(STATUSES.map((s) => [s.key, 0]));
    inquiries.forEach((inq) => { if (base[inq.status] !== undefined) base[inq.status]++; });
    return base;
  }, [inquiries]);

  const filtersActive =
    Boolean(search.trim()) || filterStatus !== "all" || Boolean(fromDate) || Boolean(toDate);

  return (
    <div className="animate-fade-in-up">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Mail className="text-brand-600" size={22} />
            Enquiries
            {counts.pending > 0 && (
              <span className="inline-flex items-center justify-center bg-brand-600 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[22px]">
                {counts.pending}
              </span>
            )}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {visible.length} of {inquiries.length} enquiries
            {counts.pending > 0 && <span className="text-brand-600 font-semibold"> · {counts.pending} not picked up yet</span>}
          </p>
        </div>

        <button
          onClick={() => dispatch(fetchAllInquiries())}
          className="admin-btn admin-btn-ghost !py-2 !text-sm w-fit"
        >
          <RotateCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* ── Pipeline strip — a summary that is also the status filter ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mb-5">
        <PipelineTile
          label="All"
          count={inquiries.length}
          dot="bg-brand-600"
          active={filterStatus === "all"}
          onClick={() => setFilterStatus("all")}
        />
        {STATUSES.map((s) => (
          <PipelineTile
            key={s.key}
            label={s.label}
            count={counts[s.key]}
            dot={s.dot}
            title={s.hint}
            active={filterStatus === s.key}
            onClick={() => setFilterStatus(filterStatus === s.key ? "all" : s.key)}
          />
        ))}
      </div>

      {/* ── Filter bar ──────────────────────────────────────── */}
      <div className="admin-card p-4 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[210px]">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                className="admin-input !pl-9"
                placeholder="Name, email, phone, subject or message…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="min-w-[150px]">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
              Status
            </label>
            <select
              className="admin-input"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s.key} value={s.key}>{s.label} ({counts[s.key]})</option>
              ))}
            </select>
          </div>

          <div className="min-w-[150px]">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
              Period
            </label>
            <select className="admin-input" value={datePreset} onChange={(e) => applyPreset(e.target.value)}>
              {DATE_PRESETS.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
              From date
            </label>
            <input
              type="date"
              className="admin-input !py-2"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => onDateEdit("from", e.target.value)}
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
              To date
            </label>
            <input
              type="date"
              className="admin-input !py-2"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => onDateEdit("to", e.target.value)}
            />
          </div>

          {filtersActive && (
            <button onClick={resetFilters} className="admin-btn admin-btn-ghost !py-2.5 !text-sm">
              <X size={14} /> Clear
            </button>
          )}
        </div>

        {filtersActive && (
          <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
            <Filter size={12} />
            Showing {visible.length} of {inquiries.length}
            {fromDate && ` · from ${fmtDate(fromDate)}`}
            {toDate && ` · to ${fmtDate(toDate)}`}
          </p>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      {loading && inquiries.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-brand-600 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="admin-card p-16 text-center">
          <Mail className="mx-auto text-slate-300 mb-3" size={40} strokeWidth={1.4} />
          <p className="text-slate-500 font-semibold">
            {inquiries.length === 0 ? "No enquiries yet." : "No enquiries match these filters."}
          </p>
          {filtersActive && inquiries.length > 0 && (
            <button onClick={resetFilters} className="admin-btn admin-btn-ghost !py-2 !text-sm mt-4">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  {["Customer", "Contact", "Subject", "Received", "Status", "Actions"].map((h) => (
                    <th key={h} className="th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((inq) => (
                    <tr key={inq._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                      <td className="td">
                        <p className="font-semibold text-slate-800 whitespace-nowrap">{inq.name}</p>
                        {inq.notes && (
                          <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-0.5" title={inq.notes}>
                            <StickyNote size={10} /> Has notes
                          </p>
                        )}
                      </td>
                      <td className="td">
                        <a href={`mailto:${inq.email}`} className="text-slate-600 hover:text-brand-700 block whitespace-nowrap no-underline">
                          {inq.email}
                        </a>
                        <a href={`tel:${inq.phone}`} className="text-slate-400 text-xs flex items-center gap-1 mt-0.5 hover:text-brand-700 no-underline">
                          <Phone size={10} /> {inq.phone}
                        </a>
                      </td>
                      <td className="td max-w-[220px]">
                        <p className="text-slate-700 truncate" title={inq.subject}>{inq.subject}</p>
                        {inq.respondedAt && (
                          <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-0.5">
                            <CheckCircle2 size={10} /> Replied {fmtDate(inq.respondedAt)}
                          </p>
                        )}
                      </td>
                      <td className="td text-slate-500 text-xs whitespace-nowrap">{fmtDate(inq.createdAt)}</td>
                      <td className="td">
                        <StatusPicker
                          value={inq.status}
                          busy={savingId === inq._id}
                          onChange={(status) => handleStatusChange(inq, status)}
                        />
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-1.5">
                          <IconButton title="View full enquiry" onClick={() => setDetailInq(inq)}>
                            <Eye size={14} />
                          </IconButton>
                          <IconButton title="Reply by email" tone="emerald" onClick={() => openRespond(inq)}>
                            <Send size={14} />
                          </IconButton>
                          <IconButton title="Delete enquiry" tone="rose" onClick={() => handleDelete(inq._id, inq.name)}>
                            <Trash2 size={14} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Detail drawer ───────────────────────────────────── */}
      {detailInq && (
        <Modal title="Enquiry details" onClose={() => setDetailInq(null)}>
          <DetailBody
            inq={detailInq}
            busy={savingId === detailInq._id}
            onStatusChange={(status) => handleStatusChange(detailInq, status)}
            onNotesSave={(notes) => handleNotesSave(detailInq, notes)}
            onReply={() => { const inq = detailInq; setDetailInq(null); openRespond(inq); }}
            onDelete={() => handleDelete(detailInq._id, detailInq.name)}
          />
        </Modal>
      )}

      {/* ── Reply ───────────────────────────────────────────── */}
      {respondInq && (
        <Modal title="Reply to enquiry" onClose={() => { setRespondInq(null); setResponseText(""); }}>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1 border border-slate-100">
              <p><span className="font-semibold text-slate-500">To:</span> {respondInq.name} ({respondInq.email})</p>
              <p><span className="font-semibold text-slate-500">Re:</span> {respondInq.subject}</p>
            </div>

            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Their message</p>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-slate-600 text-sm leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                {respondInq.message || <span className="text-slate-400">No message was included.</span>}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
                Your reply *
              </label>
              <textarea
                rows={6}
                className="admin-input resize-y"
                placeholder="Write your reply here — it is emailed to the customer as it stands."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1.5">
                Emailed to <strong className="text-slate-600">{respondInq.email}</strong>.
                A new enquiry moves to <strong className="text-slate-600">Contacted</strong>; one you
                have already moved further along keeps the status you set.
              </p>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button onClick={handleRespond} disabled={responding} className="admin-btn admin-btn-primary flex-1 disabled:opacity-60">
                {responding ? "Sending…" : <><Send size={14} /> Send reply</>}
              </button>
              <button onClick={() => { setRespondInq(null); setResponseText(""); }} className="admin-btn admin-btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── Pieces ──────────────────────────────────────────────────── */

function PipelineTile({ label, count, dot, active, title, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`admin-card !rounded-xl px-3 py-2.5 text-left transition-all duration-200 ${
        active
          ? "!border-brand-400 ring-2 ring-brand-500/20 shadow-md"
          : "hover:!border-slate-300 hover:shadow-sm"
      }`}
    >
      <span className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">{label}</span>
      </span>
      <p className="text-xl font-extrabold text-slate-900 leading-tight mt-0.5 tabular-nums">{count}</p>
    </button>
  );
}

/* A native <select> keeps the whole pipeline one tap away on a phone and one
   keystroke away on a keyboard — the colour comes from the badge behind it. */
function StatusPicker({ value, busy, onChange }) {
  const cfg = STATUS_MAP[value] || STATUSES[0];
  return (
    <span className={`relative inline-flex items-center rounded-full ${cfg.cls} ${busy ? "opacity-50" : ""}`}>
      <select
        value={value}
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Change enquiry status"
        className="appearance-none bg-transparent border-0 outline-none cursor-pointer
                   text-[11px] font-bold pl-3 pr-7 py-1.5 rounded-full focus:ring-2 focus:ring-brand-500/30"
      >
        {STATUSES.map((s) => (
          <option key={s.key} value={s.key} className="bg-white text-slate-800">{s.label}</option>
        ))}
      </select>
      <ChevronDown size={12} className="absolute right-2 pointer-events-none opacity-60" />
    </span>
  );
}

function IconButton({ children, title, onClick, tone = "brand" }) {
  const tones = {
    brand: "bg-brand-50 hover:bg-brand-100 text-brand-700 border-brand-100",
    emerald: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-100",
    rose: "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-100",
  };
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all duration-150 active:scale-95 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

function DetailBody({ inq, busy, onStatusChange, onNotesSave, onReply, onDelete }) {
  const [notes, setNotes] = useState(inq.notes || "");
  const cfg = statusOf(inq);
  const notesChanged = notes.trim() !== (inq.notes || "").trim();

  return (
    <div className="space-y-5">
      {/* Where it sits in the pipeline, changeable right here */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">Pipeline status</p>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => {
            const active = s.key === inq.status;
            return (
              <button
                key={s.key}
                type="button"
                disabled={busy}
                title={s.hint}
                onClick={() => onStatusChange(s.key)}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all duration-150 disabled:opacity-50 ${
                  active
                    ? `${s.cls} border-transparent ring-2 ring-brand-500/25`
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mt-2.5">{cfg.hint}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
        <InfoRow label="Name" value={inq.name} />
        <InfoRow label="Received" value={fmtDateTime(inq.createdAt)} />
        <InfoRow label="Email" value={<a className="text-brand-700 no-underline" href={`mailto:${inq.email}`}>{inq.email}</a>} />
        <InfoRow label="Phone" value={<a className="text-brand-700 no-underline" href={`tel:${inq.phone}`}>{inq.phone}</a>} />
        <InfoRow label="Subject" value={inq.subject} />
        <InfoRow
          label="Replied"
          value={inq.respondedAt
            ? <span className="text-emerald-600 font-semibold inline-flex items-center gap-1"><CheckCircle2 size={13} /> {fmtDateTime(inq.respondedAt)}</span>
            : <span className="text-slate-400 inline-flex items-center gap-1"><XCircle size={13} /> Not yet</span>}
        />
      </div>

      <div>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Message</p>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap break-words">
          {inq.message || <span className="text-slate-400">No message was included.</span>}
        </div>
      </div>

      {inq.adminResponse && (
        <div>
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5">Reply that was sent</p>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-emerald-900 text-sm leading-relaxed whitespace-pre-wrap">
            {inq.adminResponse}
          </div>
        </div>
      )}

      {/* Internal notes — never emailed, so the admin can be blunt about a lead */}
      <div>
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
          <StickyNote size={12} /> Internal notes
          <span className="normal-case font-normal text-slate-400 tracking-normal">— only visible here</span>
        </label>
        <textarea
          rows={3}
          className="admin-input resize-y"
          placeholder="Quoted ₹4,500 for 50 mugs, following up Monday…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        {notesChanged && (
          <div className="flex gap-2 mt-2">
            <button onClick={() => onNotesSave(notes)} disabled={busy} className="admin-btn admin-btn-primary !py-1.5 !px-4 !text-xs disabled:opacity-60">
              {busy ? "Saving…" : "Save notes"}
            </button>
            <button onClick={() => setNotes(inq.notes || "")} className="admin-btn admin-btn-ghost !py-1.5 !px-4 !text-xs">
              Discard
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-3 border-t border-slate-100">
        <button onClick={onReply} className="admin-btn admin-btn-primary flex-1">
          <Send size={14} /> {inq.respondedAt ? "Reply again" : "Reply by email"}
        </button>
        <button onClick={onDelete} className="admin-btn admin-btn-danger">
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </div>
  );
}

function Modal({ children, title, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* Lock page scroll behind the dialog so the dashboard doesn't shift/scroll */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* Portalled to <body>: the page wrapper is animated (has a transform), which
     would otherwise become the containing block for `fixed` and pull the overlay
     into the dashboard layout instead of covering the viewport. */
  return createPortal(
    <div
      className="admin-shell fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(15, 23, 42, 0.45)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="admin-card w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden animate-fade-in-up">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-slate-700 text-sm break-words">{value}</p>
    </div>
  );
}
