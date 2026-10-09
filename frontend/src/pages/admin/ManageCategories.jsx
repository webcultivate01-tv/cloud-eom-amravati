import { confirmDialog } from "../../components/ConfirmDialog";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
  addSubcategory,
  updateSubcategory,
  deleteSubcategory,
} from "../../features/categories/categorySlice";
import { toast } from "react-toastify";
import { ImageIcon } from "lucide-react";
import ImageInput from "../../components/ImageInput";

const EMPTY_CAT = { name: "", image: "", description: "", sortOrder: "0" };

const ChevronDown = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6,9 12,15 18,9"/>
  </svg>
);
const ChevronUp = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18,15 12,9 6,15"/>
  </svg>
);

export default function ManageCategories() {
  const dispatch = useDispatch();
  const { items: categories, loading } = useSelector((s) => s.categories);

  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState(null);
  const [form, setForm]             = useState(EMPTY_CAT);
  const [expandedCat, setExpandedCat] = useState(null);
  const [subInputs, setSubInputs]   = useState({});
  const [editSub, setEditSub]       = useState(null);

  useEffect(() => { dispatch(fetchCategoriesAdmin()); }, [dispatch]);

  const resetForm = () => { setForm(EMPTY_CAT); setEditId(null); setShowForm(false); };

  const handleEdit = (cat) => {
    setEditId(cat._id);
    setForm({ name: cat.name, image: cat.image || "", description: cat.description || "", sortOrder: String(cat.sortOrder ?? 0) });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, sortOrder: Number(form.sortOrder) };
    const result = editId
      ? await dispatch(updateCategory({ id: editId, payload }))
      : await dispatch(createCategory(payload));
    if (!result.error) { toast.success(editId ? "Category updated!" : "Category created!"); resetForm(); }
    else toast.error(result.payload || "Failed");
  };

  const handleDelete = async (cat) => {
    if (!(await confirmDialog(`Delete "${cat.name}" and all its subcategories?`))) return;
    const result = await dispatch(deleteCategory(cat._id));
    if (!result.error) toast.success("Category deleted");
    else toast.error(result.payload);
  };

  const handleToggleActive = async (cat) => {
    await dispatch(updateCategory({ id: cat._id, payload: { isActive: !cat.isActive } }));
  };

  const handleToggleNavbar = async (cat) => {
    const next = cat.showInNavbar === false;
    const result = await dispatch(updateCategory({ id: cat._id, payload: { showInNavbar: next } }));
    if (result.error) toast.error(result.payload);
    else toast.success(next ? `"${cat.name}" now shows in the navbar` : `"${cat.name}" removed from the navbar`);
  };

  const handleAddSub = async (catId) => {
    const name = (subInputs[catId] || "").trim();
    if (!name) return;
    const result = await dispatch(addSubcategory({ catId, name }));
    if (!result.error) { toast.success("Subcategory added"); setSubInputs((p) => ({ ...p, [catId]: "" })); }
    else toast.error(result.payload);
  };

  const handleSaveSubEdit = async () => {
    if (!editSub) return;
    const result = await dispatch(updateSubcategory({ catId: editSub.catId, subId: editSub.subId, payload: { name: editSub.name } }));
    if (!result.error) { toast.success("Updated"); setEditSub(null); }
    else toast.error(result.payload);
  };

  const handleToggleSub = async (catId, sub) => {
    await dispatch(updateSubcategory({ catId, subId: sub._id, payload: { isActive: !sub.isActive } }));
  };

  const handleDeleteSub = async (catId, sub) => {
    if (!(await confirmDialog(`Delete subcategory "${sub.name}"?`))) return;
    const result = await dispatch(deleteSubcategory({ catId, subId: sub._id }));
    if (!result.error) toast.success("Subcategory deleted");
    else toast.error(result.payload);
  };

  return (
    <div className="animate-fade-in-up">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Manage Categories</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {categories.length} categories configured · {categories.filter((c) => c.isActive && c.showInNavbar !== false).length} shown in the website navbar
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm((v) => !v); }}
          className={`admin-btn ${showForm ? "admin-btn-ghost" : "admin-btn-primary"}`}
        >
          {showForm ? "✕ Cancel" : "+ Add Category"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="admin-card p-6 mb-6 animate-fade-in-up">
          <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center text-sm">{editId ? "✏️" : "➕"}</span>
            {editId ? "Edit Category" : "New Category"}
          </h2>

          <div className="flex flex-wrap gap-5 mb-5">
            {/* Image — upload or URL */}
            <div className="shrink-0">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Category Image *</p>
              <ImageInput
                value={form.image}
                onChange={(url) => setForm((f) => ({ ...f, image: url }))}
                previewSize="square"
                folder="categories"
              />
            </div>

            {/* Fields */}
            <div className="flex-1 min-w-[200px] flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Category Name *</label>
                <input
                  className="admin-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. T-Shirts"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                  Tagline <span className="normal-case font-normal">(shown under the name on the homepage card)</span>
                </label>
                <input
                  className="admin-input"
                  value={form.description}
                  maxLength={80}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Custom prints for every occasion"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Sort Order <span className="normal-case font-normal">(lower = first)</span></label>
                <input
                  className="admin-input !w-28"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </div>

              {/* Preview */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 mt-2">
                {form.image ? (
                  <img src={form.image} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400">
                    <ImageIcon size={18} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{form.name || "Category Name"}</p>
                  {form.description && <p className="text-xs text-slate-400 truncate">{form.description}</p>}
                </div>
                <span className="ml-auto text-xs text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded-lg">Preview</span>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="admin-btn admin-btn-primary disabled:opacity-60">
            {loading ? "Saving…" : editId ? "Update Category" : "Create Category"}
          </button>
        </form>
      )}

      {/* Category list */}
      {loading && categories.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
            <div className="absolute inset-0 rounded-full border-4 border-t-brand-600 animate-spin" />
          </div>
        </div>
      ) : categories.length === 0 ? (
        <div className="admin-card p-16 text-center">
          <p className="text-4xl mb-3">🏷️</p>
          <p className="text-slate-500 font-medium">No categories yet. Create your first one!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {categories.map((cat) => {
            const isExpanded = expandedCat === cat._id;
            const subCount   = cat.subcategories?.length || 0;
            return (
              <div key={cat._id} className="admin-card overflow-hidden hover:shadow-card-hover transition-shadow duration-200">

                {/* Category row */}
                <div className="flex items-center justify-between flex-wrap gap-3 p-4 sm:p-5">
                  <div className="flex items-center gap-4">
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-14 h-14 shrink-0 rounded-2xl object-cover border border-slate-200 shadow-sm"
                      />
                    ) : (
                      <div className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 border border-brand-100 flex items-center justify-center text-slate-300 shadow-sm">
                        <ImageIcon size={22} strokeWidth={1.5} />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-800">{cat.name}</p>
                        {!cat.isActive && (
                          <span className="status-badge bg-brand-100 text-brand-500 !text-[10px]">Hidden</span>
                        )}
                        {cat.sortOrder > 0 && (
                          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Order: {cat.sortOrder}</span>
                        )}
                      </div>
                      {cat.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{cat.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">
                        <span className="font-medium text-brand-500">{subCount}</span> subcategor{subCount !== 1 ? "ies" : "y"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setExpandedCat(isExpanded ? null : cat._id)}
                      className={`admin-btn !py-1.5 !px-3 !text-xs flex items-center gap-1.5 ${
                        isExpanded ? "bg-brand-100 text-brand-700" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                      }`}
                    >
                      {isExpanded ? <ChevronUp /> : <ChevronDown />}
                      Subcats ({subCount})
                    </button>
                    <button
                      onClick={() => handleEdit(cat)}
                      className="admin-btn bg-brand-50 hover:bg-brand-100 text-brand-700 !py-1.5 !px-3 !text-xs"
                    >✏️ Edit</button>
                    <button
                      onClick={() => handleToggleNavbar(cat)}
                      title="Show or hide this category in the website's top navigation bar"
                      className={`admin-btn !py-1.5 !px-3 !text-xs ${
                        cat.showInNavbar !== false
                          ? "bg-sky-50 hover:bg-sky-100 text-sky-700"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-500"
                      }`}
                    >
                      {cat.showInNavbar !== false ? "🧭 In Navbar" : "➖ Not in Navbar"}
                    </button>
                    <button
                      onClick={() => handleToggleActive(cat)}
                      className={`admin-btn !py-1.5 !px-3 !text-xs ${
                        cat.isActive
                          ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                          : "bg-brand-50 hover:bg-brand-100 text-brand-500"
                      }`}
                    >
                      {cat.isActive ? "👁 Visible" : "🚫 Hidden"}
                    </button>
                    <button
                      onClick={() => handleDelete(cat)}
                      className="admin-btn bg-brand-50 hover:bg-brand-100 text-brand-600 !py-1.5 !px-3 !text-xs"
                    >🗑 Delete</button>
                  </div>
                </div>

                {/* Subcategories panel */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/60 p-4 sm:p-5 animate-fade-in-up">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                      Subcategories
                    </p>

                    {subCount === 0 && (
                      <p className="text-xs text-slate-400 mb-3">No subcategories yet.</p>
                    )}

                    <div className="flex flex-col gap-2 mb-4">
                      {cat.subcategories?.map((sub) => (
                        <div
                          key={sub._id}
                          className={`flex items-center gap-2.5 bg-white rounded-xl px-3 py-2.5 border border-slate-100 shadow-sm ${!sub.isActive ? "opacity-50" : ""}`}
                        >
                          {editSub?.subId === sub._id ? (
                            <>
                              <input
                                autoFocus
                                className="admin-input !py-1.5 !text-xs flex-1"
                                value={editSub.name}
                                onChange={(e) => setEditSub({ ...editSub, name: e.target.value })}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSaveSubEdit(); } }}
                              />
                              <button onClick={handleSaveSubEdit} className="admin-btn admin-btn-success !py-1 !px-3 !text-xs">Save</button>
                              <button onClick={() => setEditSub(null)} className="admin-btn admin-btn-ghost !py-1 !px-2.5 !text-xs">✕</button>
                            </>
                          ) : (
                            <>
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${sub.isActive ? "bg-emerald-400" : "bg-slate-300"}`} />
                              <span className={`text-sm text-slate-700 flex-1 font-medium ${!sub.isActive ? "line-through" : ""}`}>
                                {sub.name}
                              </span>
                              <button
                                onClick={() => setEditSub({ catId: cat._id, subId: sub._id, name: sub.name })}
                                className="admin-btn bg-brand-50 hover:bg-brand-100 text-brand-600 !py-1 !px-2.5 !text-xs"
                              >✏️</button>
                              <button
                                onClick={() => handleToggleSub(cat._id, sub)}
                                className={`admin-btn !py-1 !px-2.5 !text-xs ${
                                  sub.isActive
                                    ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-600"
                                    : "bg-brand-50 hover:bg-brand-100 text-brand-500"
                                }`}
                              >
                                {sub.isActive ? "On" : "Off"}
                              </button>
                              <button
                                onClick={() => handleDeleteSub(cat._id, sub)}
                                className="admin-btn bg-brand-50 hover:bg-brand-100 text-brand-500 !py-1 !px-2.5 !text-xs"
                              >🗑</button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add subcategory */}
                    <div className="flex gap-2">
                      <input
                        className="admin-input flex-1 !py-2 !text-sm"
                        placeholder="New subcategory name…"
                        value={subInputs[cat._id] || ""}
                        onChange={(e) => setSubInputs((p) => ({ ...p, [cat._id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSub(cat._id); } }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddSub(cat._id)}
                        className="admin-btn admin-btn-primary !py-2 !px-4 !text-sm"
                      >+ Add</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
