import { confirmDialog } from "../../components/ConfirmDialog";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllEventsAdmin,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../../features/events/eventSlice";
import { toast } from "react-toastify";
import ImageInput from "../../components/ImageInput";

const BADGE_OPTIONS = ["Announcement", "New Offer", "Flash Sale", "Order Update", "Holiday", "Info"];

const BADGE_CFG = {
  "Announcement": { cls: "bg-amber-100 text-amber-700",   icon: "📣" },
  "New Offer":    { cls: "bg-rose-100 text-rose-700",     icon: "🎁" },
  "Flash Sale":   { cls: "bg-orange-100 text-orange-700", icon: "⚡" },
  "Order Update": { cls: "bg-sky-100 text-sky-700",       icon: "📦" },
  "Holiday":      { cls: "bg-emerald-100 text-emerald-700", icon: "🎉" },
  "Info":         { cls: "bg-slate-100 text-slate-600",   icon: "ℹ️" },
};

const EMPTY_FORM = { title: "", description: "", image: "", link: "", badge: "Announcement", isActive: true, expiresAt: "" };

const isExpired = (expiresAt) => expiresAt && new Date(expiresAt) < new Date();

export default function ManageEvents() {
  const dispatch = useDispatch();
  const { events, loading } = useSelector((state) => state.events);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);

  useEffect(() => { dispatch(fetchAllEventsAdmin()); }, [dispatch]);

  const resetForm = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(false); };

  const handleEdit = (event) => {
    setEditId(event._id);
    setForm({
      title:       event.title,
      description: event.description,
      image:       event.image || "",
      link:        event.link || "",
      badge:       event.badge || "Announcement",
      isActive:    event.isActive,
      expiresAt:   event.expiresAt ? event.expiresAt.split("T")[0] : "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, expiresAt: form.expiresAt || null };
    const result = editId
      ? await dispatch(updateEvent({ id: editId, eventData: payload }))
      : await dispatch(createEvent(payload));
    if (!result.error) { toast.success(editId ? "Event updated!" : "Event created!"); resetForm(); }
    else toast.error(result.payload);
  };

  const handleDelete = async (id, title) => {
    if (!(await confirmDialog(`Delete event "${title}"?`))) return;
    const result = await dispatch(deleteEvent(id));
    if (!result.error) toast.success("Event deleted");
    else toast.error(result.payload);
  };

  const selectedBadgeCfg = BADGE_CFG[form.badge] || BADGE_CFG["Info"];

  return (
    <div className="animate-fade-in-up">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Events & Announcements</h1>
          <p className="text-slate-400 text-sm mt-0.5">{events.length} event{events.length !== 1 ? "s" : ""} total</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm((v) => !v); }}
          className={`admin-btn ${showForm ? "admin-btn-ghost" : "admin-btn-primary"}`}
        >
          {showForm ? "✕ Cancel" : "+ Create Event"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="admin-card p-6 mb-6 animate-fade-in-up">
          <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center text-sm">{editId ? "✏️" : "📣"}</span>
            {editId ? "Edit Event" : "Create New Event / Announcement"}
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Title */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Title *</label>
              <input
                className="admin-input"
                placeholder="e.g. Flash Sale — 30% off all orders today!"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Description *</label>
              <textarea
                className="admin-input h-20 resize-y"
                placeholder="Write the announcement details here…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>

            {/* Image — upload from device OR paste URL */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Event Image <span className="normal-case font-normal">(optional — shown on website)</span></label>
              <ImageInput
                value={form.image}
                onChange={(url) => setForm((f) => ({ ...f, image: url }))}
                previewSize="wide"
                folder="events"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                Recommended 16:9 — banners, offer posters, event photos. You can upload from device or paste an image URL.
              </p>
            </div>

            {/* Badge, Link, Expiry row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Badge Type</label>
                <select
                  className="admin-input"
                  value={form.badge}
                  onChange={(e) => setForm({ ...form, badge: e.target.value })}
                >
                  {BADGE_OPTIONS.map((b) => <option key={b} value={b}>{BADGE_CFG[b]?.icon} {b}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Link <span className="normal-case font-normal">(optional)</span></label>
                <input
                  className="admin-input"
                  placeholder="/products or https://…"
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Expiry Date <span className="normal-case font-normal">(optional)</span></label>
                <input
                  className="admin-input"
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
              </div>
            </div>

            {/* Active toggle + preview row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-brand-600"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Active — visible on website
              </label>

              {/* Live preview of the badge */}
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Preview badge:</span>
                <span className={`status-badge ${selectedBadgeCfg.cls}`}>
                  {selectedBadgeCfg.icon} {form.badge}
                </span>
              </div>
            </div>

            <div className="pt-1">
              <button type="submit" disabled={loading} className="admin-btn admin-btn-primary disabled:opacity-60">
                {loading ? "Saving…" : editId ? "Update Event" : "Publish Event"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Events grid */}
      {loading && !showForm ? (
        <div className="flex items-center justify-center py-24">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
            <div className="absolute inset-0 rounded-full border-4 border-t-brand-600 animate-spin" />
          </div>
        </div>
      ) : events.length === 0 ? (
        <div className="admin-card p-16 text-center">
          <p className="text-4xl mb-3">📢</p>
          <p className="text-slate-500 font-medium">No events yet. Create your first announcement!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {events.map((event) => {
            const badgeCfg  = BADGE_CFG[event.badge] || BADGE_CFG["Info"];
            const expired   = isExpired(event.expiresAt);
            const inactive  = !event.isActive;
            return (
              <div
                key={event._id}
                className={`admin-card flex flex-col hover:shadow-card-hover transition-all duration-200 overflow-hidden ${inactive ? "opacity-60" : ""}`}
              >
                {/* Event image (if any) */}
                {event.image ? (
                  <div className="relative h-40 w-full bg-slate-100 overflow-hidden">
                    <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 flex gap-1.5">
                      <span className={`status-badge ${badgeCfg.cls} shadow`}>
                        {badgeCfg.icon} {event.badge}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={`h-1 w-full rounded-t-2xl ${badgeCfg.cls.split(" ")[0].replace("bg-", "bg-")}`} />
                )}

                <div className="p-5 flex flex-col flex-1">
                  {/* Badge row */}
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className={`status-badge ${badgeCfg.cls}`}>
                      {badgeCfg.icon} {event.badge}
                    </span>
                    {inactive && (
                      <span className="status-badge bg-slate-100 text-slate-500">Hidden</span>
                    )}
                    {expired && (
                      <span className="status-badge bg-red-100 text-red-500">Expired</span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-slate-800 mb-2 leading-snug">{event.title}</h3>

                  {/* Description */}
                  <p className="text-sm text-slate-500 leading-relaxed mb-3 flex-1">{event.description}</p>

                  {/* Link */}
                  {event.link && (
                    <div className="flex items-center gap-1.5 text-xs text-brand-500 bg-brand-50 border border-brand-100 rounded-lg px-3 py-1.5 mb-3 w-fit">
                      <span>🔗</span>
                      <span className="truncate max-w-[180px]">{event.link}</span>
                    </div>
                  )}

                  {/* Expiry */}
                  {event.expiresAt && (
                    <p className={`text-xs mb-2 flex items-center gap-1 ${expired ? "text-red-400 font-semibold" : "text-slate-400"}`}>
                      <span>⏳</span>
                      {expired ? "Expired" : "Expires"}: {new Date(event.expiresAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </p>
                  )}

                  {/* Meta */}
                  <p className="text-xs text-slate-400 border-t border-slate-100 pt-3 mt-auto">
                    Created by <span className="font-medium text-slate-500">{event.createdBy?.name || "Admin"}</span>
                    {" · "}
                    {new Date(event.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleEdit(event)}
                      className="admin-btn bg-brand-50 hover:bg-brand-100 text-brand-700 !py-1.5 !px-3 !text-xs flex-1"
                    >✏️ Edit</button>
                    <button
                      onClick={() => handleDelete(event._id, event.title)}
                      className="admin-btn bg-brand-50 hover:bg-brand-100 text-brand-600 !py-1.5 !px-3 !text-xs flex-1"
                    >🗑 Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
