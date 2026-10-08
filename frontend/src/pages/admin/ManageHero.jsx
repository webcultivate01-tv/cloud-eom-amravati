import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ArrowUp, ArrowDown } from "lucide-react";
import api from "../../utils/api";
import ImageInput from "../../components/ImageInput";

const EMPTY_FORM = { image: "", title: "", tag: "", cta: "Shop Now", link: "/products", isActive: true };

/* The slides the website ships with — importable so they can be edited/deleted */
const DEFAULT_SLIDES = [
  { image: "/hero_mug.webp",   tag: "Premium Mugs",    title: "BOLD MOVES\nSTART HERE", cta: "Shop Now",         link: "/products?category=Cup" },
  { image: "/hero_shirt.webp", tag: "Custom Apparels", title: "WEAR YOUR\nATTITUDE",    cta: "Explore Apparels", link: "/products?category=T-Shirt" },
  { image: "/hero_diary.webp", tag: "Corporate Gifts", title: "MAKE AN\nIMPRESSION",    cta: "View Corporate",   link: "/products?category=Diary" },
];

const errMsg =(err, fallback) => err?.response?.data?.message || fallback;

export default function ManageHero() {
  const [slides, setSlides]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [cats, setCats]         = useState([]);

  const loadCats = async () => {
    try {
      const { data } = await api.get("/categories/admin/all");
      setCats(data);
    } catch (err) {
      toast.error(errMsg(err, "Failed to load categories"));
    }
  };

  const load = async () => {
    try {
      const { data } = await api.get("/hero/admin/all");
      setSlides(data);
    } catch (err) {
      toast.error(errMsg(err, "Failed to load slides"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); loadCats(); }, []);

  const resetForm = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(false); };

  const handleEdit = (s) => {
    setEditId(s._id);
    setForm({
      image: s.image, title: s.title || "", tag: s.tag || "",
      cta: s.cta || "", link: s.link || "", isActive: s.isActive,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.image) return toast.error("Please add a slide image");
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/hero/${editId}`, form);
      } else {
        // New slides go to the end of the slider
        const next = slides.length ? Math.max(...slides.map((s) => s.sortOrder || 0)) + 1 : 0;
        await api.post("/hero", { ...form, sortOrder: next });
      }
      toast.success(editId ? "Slide updated!" : "Slide added!");
      resetForm();
      await load();
    } catch (err) {
      toast.error(errMsg(err, "Failed to save slide"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete this slide${s.title ? ` "${s.title.replace(/\n/g, " ")}"` : ""}?`)) return;
    try {
      await api.delete(`/hero/${s._id}`);
      toast.success("Slide deleted");
      await load();
    } catch (err) {
      toast.error(errMsg(err, "Failed to delete slide"));
    }
  };

  const handleImportDefaults = async () => {
    setSaving(true);
    try {
      // Sequential so sortOrder / createdAt keep the original order
      for (let i = 0; i < DEFAULT_SLIDES.length; i++) {
        await api.post("/hero", { ...DEFAULT_SLIDES[i], isActive: true, sortOrder: i });
      }
      toast.success("Current slides imported");
      await load();
    } catch (err) {
      toast.error(errMsg(err, "Failed to import slides"));
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (s) => {
    try {
      await api.put(`/hero/${s._id}`, { isActive: !s.isActive });
      await load();
    } catch (err) {
      toast.error(errMsg(err, "Failed to update slide"));
    }
  };

  /* Swap positions with the neighbour; sortOrder is rewritten 0..n so ties can't happen */
  const handleMove = async (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= slides.length) return;
    const reordered = [...slides];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    setSlides(reordered);
    try {
      await Promise.all(
        reordered.map((s, i) => (s.sortOrder === i ? null : api.put(`/hero/${s._id}`, { sortOrder: i })))
      );
      await load();
    } catch (err) {
      toast.error(errMsg(err, "Failed to reorder"));
      load();
    }
  };

  /* Navbar categories: show/hide + order (same data as Admin → Categories) */
  const handleCatToggle = async (c) => {
    try {
      await api.put(`/categories/${c._id}`, { showInNavbar: c.showInNavbar === false });
      await loadCats();
    } catch (err) {
      toast.error(errMsg(err, "Failed to update category"));
    }
  };

  const handleCatMove = async (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= cats.length) return;
    const reordered = [...cats];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    setCats(reordered);
    try {
      await Promise.all(
        reordered.map((c, i) => (c.sortOrder === i ? null : api.put(`/categories/${c._id}`, { sortOrder: i })))
      );
      await loadCats();
    } catch (err) {
      toast.error(errMsg(err, "Failed to reorder"));
      loadCats();
    }
  };

  const titleLines = (form.title || "").split("\n");

  return (
    <div className="animate-fade-in-up">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Hero Section</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {slides.length} slide{slides.length !== 1 ? "s" : ""} · shown on the homepage slider in this order
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm((v) => !v); }}
          className={`admin-btn ${showForm ? "admin-btn-ghost" : "admin-btn-primary"}`}
        >
          {showForm ? "✕ Cancel" : "+ Add Slide"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="admin-card p-6 mb-6 animate-fade-in-up flex flex-col gap-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center text-sm">{editId ? "✏️" : "🖼️"}</span>
            {editId ? "Edit Slide" : "New Slide"}
          </h2>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Slide Image *</label>
            <ImageInput
              value={form.image}
              onChange={(url) => setForm((f) => ({ ...f, image: url }))}
              previewSize="wide"
              folder="hero"
            />
            <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
              Wide landscape image works best (about 1920×800). Text is placed on the right side, so keep the right side of the picture uncluttered.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                Headline <span className="normal-case font-normal">(Enter = new line)</span>
              </label>
              <textarea
                className="admin-input h-20 resize-y"
                placeholder={"BOLD MOVES\nSTART HERE"}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Tag <span className="normal-case font-normal">(small label)</span></label>
                <input className="admin-input" placeholder="Premium Mugs" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Button Text</label>
                  <input className="admin-input" placeholder="Shop Now" value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Button Link</label>
                  <input className="admin-input" placeholder="/products?category=Cup" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
                </div>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 -mt-2">Leave Tag or Button Text empty to hide them on the slide.</p>

          {/* Live preview */}
          {form.image && (
            <div className="relative h-40 rounded-xl overflow-hidden bg-slate-200 flex items-center justify-end px-6"
                 style={{ backgroundImage: `url(${form.image})`, backgroundSize: "cover", backgroundPosition: "center" }}>
              <div className="absolute inset-0 bg-black/30" />
              <div className="relative text-right">
                <p className="text-white font-black italic uppercase leading-none text-lg">
                  {titleLines.map((l, i) => <span key={i} className="block">{l}</span>)}
                </p>
                {form.tag && <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-widest text-white bg-brand-700/80 px-2 py-0.5">{form.tag}</span>}
                {form.cta && <div className="mt-2"><span className="inline-block border-2 border-white text-white text-[10px] font-black uppercase px-3 py-1">{form.cta} →</span></div>}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer select-none">
            <input type="checkbox" className="w-4 h-4 rounded accent-brand-600" checked={form.isActive}
                   onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Active — visible on website
          </label>

          <div>
            <button type="submit" disabled={saving} className="admin-btn admin-btn-primary disabled:opacity-60">
              {saving ? "Saving…" : editId ? "Update Slide" : "Add Slide"}
            </button>
          </div>
        </form>
      )}

      {/* Slides list */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
            <div className="absolute inset-0 rounded-full border-4 border-t-brand-600 animate-spin" />
          </div>
        </div>
      ) : slides.length === 0 ? (
        <div className="admin-card p-16 text-center">
          <p className="text-4xl mb-3">🖼️</p>
          <p className="text-slate-500 font-medium">No slides yet — the website is showing the default slides.</p>
          <p className="text-slate-400 text-sm mt-1">Import the current slides to edit or delete them, or add a new one.</p>
          <button onClick={handleImportDefaults} disabled={saving} className="admin-btn admin-btn-primary mt-4 disabled:opacity-60">
            {saving ? "Importing…" : "⬇ Import current slides"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {slides.map((s, idx) => (
            <div key={s._id} className={`admin-card overflow-hidden flex flex-wrap sm:flex-nowrap ${!s.isActive ? "opacity-60" : ""}`}>
              <div className="w-full sm:w-64 h-36 shrink-0 bg-slate-100">
                <img src={s.image} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0 p-4 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">#{idx + 1}</span>
                  {!s.isActive && <span className="status-badge bg-slate-100 text-slate-500">Hidden</span>}
                </div>
                <p className="font-bold text-slate-800 leading-snug whitespace-pre-line">{s.title || <span className="text-slate-400 font-normal">No headline</span>}</p>
                {s.tag && <p className="text-xs text-slate-500">{s.tag}</p>}
                {s.cta && <p className="text-xs text-brand-500 truncate">🔗 {s.cta} → {s.link}</p>}
              </div>
              <div className="flex sm:flex-col items-center justify-end gap-2 p-4 flex-wrap">
                <div className="flex gap-1.5">
                  <button onClick={() => handleMove(idx, -1)} disabled={idx === 0} aria-label="Move up"
                          className="admin-btn bg-slate-100 hover:bg-slate-200 text-slate-600 !py-1.5 !px-2 disabled:opacity-30"><ArrowUp size={14} /></button>
                  <button onClick={() => handleMove(idx, 1)} disabled={idx === slides.length - 1} aria-label="Move down"
                          className="admin-btn bg-slate-100 hover:bg-slate-200 text-slate-600 !py-1.5 !px-2 disabled:opacity-30"><ArrowDown size={14} /></button>
                </div>
                <button onClick={() => handleEdit(s)} className="admin-btn bg-brand-50 hover:bg-brand-100 text-brand-700 !py-1.5 !px-3 !text-xs">✏️ Edit</button>
                <button onClick={() => handleToggle(s)}
                        className={`admin-btn !py-1.5 !px-3 !text-xs ${s.isActive ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700" : "bg-brand-50 hover:bg-brand-100 text-brand-500"}`}>
                  {s.isActive ? "👁 Visible" : "🚫 Hidden"}
                </button>
                <button onClick={() => handleDelete(s)} className="admin-btn bg-brand-50 hover:bg-brand-100 text-brand-600 !py-1.5 !px-3 !text-xs">🗑 Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Navbar categories */}
      <div className="mt-10">
        <h2 className="text-xl font-black text-slate-800 tracking-tight">Navbar Categories</h2>
        <p className="text-slate-400 text-sm mt-0.5 mb-4">
          Choose which categories appear in the website's top bar and in what order. Add or rename categories in Admin → Categories.
        </p>
        {cats.length === 0 ? (
          <div className="admin-card p-8 text-center text-slate-400 text-sm">No categories yet.</div>
        ) : (
          <div className="admin-card divide-y divide-slate-100">
            {cats.map((c, idx) => {
              const shown = c.isActive && c.showInNavbar !== false;
              return (
                <div key={c._id} className={`flex items-center gap-3 p-3 ${shown ? "" : "opacity-60"}`}>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">#{idx + 1}</span>
                  <span className="text-lg">{c.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">{c.name}</p>
                    {!c.isActive && <p className="text-[11px] text-slate-400">Category is inactive — never shown</p>}
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleCatMove(idx, -1)} disabled={idx === 0} aria-label="Move up"
                            className="admin-btn bg-slate-100 hover:bg-slate-200 text-slate-600 !py-1.5 !px-2 disabled:opacity-30"><ArrowUp size={14} /></button>
                    <button onClick={() => handleCatMove(idx, 1)} disabled={idx === cats.length - 1} aria-label="Move down"
                            className="admin-btn bg-slate-100 hover:bg-slate-200 text-slate-600 !py-1.5 !px-2 disabled:opacity-30"><ArrowDown size={14} /></button>
                  </div>
                  <button onClick={() => handleCatToggle(c)}
                          className={`admin-btn !py-1.5 !px-3 !text-xs ${c.showInNavbar !== false ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700" : "bg-brand-50 hover:bg-brand-100 text-brand-500"}`}>
                    {c.showInNavbar !== false ? "👁 In navbar" : "🚫 Hidden"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
