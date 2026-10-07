import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../../features/products/productSlice";
import { fetchCategoriesAdmin } from "../../features/categories/categorySlice";
import { toast } from "react-toastify";
import {
  ShoppingBag, Pencil, Trash2, Search, X, Plus, Check, AlertTriangle,
  Image, Box, Tag, IndianRupee, BarChart3, ChevronDown, Filter,
  LayoutGrid, List, PackageX, Layers,
} from "lucide-react";
import MultiImageInput from "../../components/MultiImageInput";

/* ── Product type options ─────────────────────────────── */
const TYPE_OPTIONS = [
  {
    value: "direct",
    icon: ShoppingBag,
    name: "Direct Sale",
    desc: "Customer buys as-is, no custom image.",
  },
  {
    value: "required",
    icon: Image,
    name: "Custom Required",
    desc: "Order blocked until design is uploaded.",
  },
];

/* Mirrors the server's slugify, so the folder shown in the form is the one the
   image actually lands in (backend/config/localUpload.js). */
const folderSlug = (str) =>
  String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const typeBadge = (p) => {
  if (p.requiresCustomImage) return { label: "Custom Required", cls: "bg-purple-100 text-purple-700" };
  return { label: "Direct Sale", cls: "bg-emerald-100 text-emerald-700" };
};

/* Dark label shown above each form field so admins know what to enter. */
const Field = ({ label, required, hint, className = "", children }) => (
  <div className={className}>
    <label className="block text-[13px] font-semibold text-slate-800 mb-1.5">
      {label}{required && <span className="text-brand-600"> *</span>}
      {hint && <span className="font-normal text-slate-400 text-xs"> ({hint})</span>}
    </label>
    {children}
  </div>
);

/* ── Main component ─────────────────────────────────────── */
export default function ManageProducts() {
  const dispatch = useDispatch();
  const { items: products, loading } = useSelector((s) => s.products);
  const { items: categoryItems }     = useSelector((s) => s.categories);
  const CATEGORIES = categoryItems.map((c) => c.name);

  const EMPTY_FORM = {
    name: "", description: "", price: "", originalPrice: "", brand: "", sku: "",
    category: CATEGORIES[0] || "", stock: "100",
    allowCustomImage: false, requiresCustomImage: false, isAvailable: true,
    allowCOD: true,
    weight: "", returnPolicy: "",
  };

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [images, setImages]     = useState([]); // single URL array — covers both uploads and URLs
  const [sizes, setSizes]       = useState([]); // size variants e.g. ["S","M","L"]
  const [sizeInput, setSizeInput] = useState("");

  /* Filters */
  const [searchTerm, setSearchTerm]     = useState("");
  const [categoryTab, setCategoryTab]   = useState("all");

  /* Highlights */
  const [highlights, setHighlights] = useState([]);
  const [hlInput, setHlInput]       = useState("");

  /* Specifications */
  const [specifications, setSpecifications] = useState([]);
  const [specKey, setSpecKey]               = useState("");
  const [specVal, setSpecVal]               = useState("");

  useEffect(() => {
    dispatch(fetchAllProductsAdmin());
    dispatch(fetchCategoriesAdmin());
  }, [dispatch]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setImages([]); setSizes([]); setSizeInput(""); setEditId(null); setShowForm(false);
    setHighlights([]); setHlInput("");
    setSpecifications([]); setSpecKey(""); setSpecVal("");
  };

  const handleEdit = (p) => {
    setEditId(p._id);
    setForm({
      name: p.name, description: p.description, price: p.price,
      originalPrice: p.originalPrice || "", brand: p.brand || "", sku: p.sku || "",
      category: p.category, stock: p.stock,
      allowCustomImage: !!p.requiresCustomImage,
      requiresCustomImage: p.requiresCustomImage || false, isAvailable: p.isAvailable,
      allowCOD: p.allowCOD !== undefined ? p.allowCOD : true,
      weight: p.weight || "", returnPolicy: p.returnPolicy || "",
    });
    setImages(p.images?.length ? p.images : p.image ? [p.image] : []);
    setSizes(p.sizes || []);
    setHighlights(p.highlights || []);
    setSpecifications(p.specifications || []);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addSize = () => {
    const s = sizeInput.trim().toUpperCase();
    if (!s) return;
    if (sizes.includes(s)) { setSizeInput(""); return; }
    setSizes((p) => [...p, s]);
    setSizeInput("");
  };

  const addSizePreset = (s) => {
    if (sizes.includes(s)) return;
    setSizes((p) => [...p, s]);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    const result = await dispatch(deleteProduct(id));
    if (!result.error) toast.success("Product deleted");
    else toast.error("Delete failed");
  };

  const setProductType = (type) => {
    if (type === "direct")   setForm((f) => ({ ...f, allowCustomImage: false, requiresCustomImage: false }));
    if (type === "required") setForm((f) => ({ ...f, allowCustomImage: true,  requiresCustomImage: true  }));
  };

  const productType = form.requiresCustomImage ? "required" : "direct";

  const addHighlight = () => {
    if (!hlInput.trim()) return;
    setHighlights((h) => [...h, hlInput.trim()]);
    setHlInput("");
  };

  const addSpec = () => {
    if (!specKey.trim() || !specVal.trim()) return;
    setSpecifications((s) => [...s, { key: specKey.trim(), value: specVal.trim() }]);
    setSpecKey(""); setSpecVal("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, images, sizes, highlights, specifications };
    const result = editId
      ? await dispatch(updateProduct({ id: editId, payload }))
      : await dispatch(createProduct(payload));
    if (!result.error) { toast.success(editId ? "Product updated!" : "Product created!"); resetForm(); }
    else toast.error(result.payload || "Operation failed");
  };

  /* Category counts */
  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = products.filter((p) => p.category === cat).length;
    return acc;
  }, {});

  /* Filtered products */
  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      p.name?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term) ||
      p.brand?.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term);
    const matchesTab = categoryTab === "all" || p.category === categoryTab;
    return matchesSearch && matchesTab;
  });

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="animate-fade-in-up">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Manage Products</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {filteredProducts.length} of {products.length} products
            {categoryTab !== "all" && <span className="text-brand-600 font-semibold"> · {categoryTab}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search products…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-input !w-56 !text-sm pl-9 pr-3"
            />
          </div>
          <button
            onClick={() => { resetForm(); setShowForm((v) => !v); }}
            className={`admin-btn ${showForm ? "admin-btn-ghost" : "admin-btn-primary"}`}
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            <span>{showForm ? "Cancel" : "Add Product"}</span>
          </button>
        </div>
      </div>

      {/* ── Category Tabs ──────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setCategoryTab("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                       whitespace-nowrap transition-all duration-150 shrink-0 border
                       ${categoryTab === "all"
                         ? "bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-200"
                         : "bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600"
                       }`}
        >
          <Layers size={14} />
          All
          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full
                            ${categoryTab === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
            {products.length}
          </span>
        </button>

        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryTab(cat)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                         whitespace-nowrap transition-all duration-150 shrink-0 border
                         ${categoryTab === cat
                           ? "bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-200"
                           : "bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600"
                         }`}
          >
            <Tag size={13} />
            {cat}
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full
                              ${categoryTab === cat ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
              {categoryCounts[cat] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* ── Form ─────────────────────────────────────────── */}
      {showForm && (
        <form onSubmit={handleSubmit} className="admin-card p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
            {editId ? <Pencil size={18} /> : <Plus size={18} />}
            {editId ? "Edit Product" : "Add New Product"}
          </h2>

          {/* Product Type */}
          <div className="mb-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Product Type</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TYPE_OPTIONS.map(({ value, icon: Icon, name, desc }) => {
                const active = productType === value;
                return (
                  <label
                    key={value}
                    className={`flex flex-col gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all select-none ${
                      active
                        ? value === "required"
                          ? "border-brand-300 bg-brand-50"
                          : "border-brand-300 bg-brand-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <input type="radio" name="productType" checked={active} onChange={() => setProductType(value)} className="hidden" />
                    <Icon
                      size={20}
                      className={active ? (value === "required" ? "text-brand-600" : "text-brand-600") : "text-slate-400"}
                    />
                    <span className={`font-semibold text-sm ${active ? (value === "required" ? "text-brand-800" : "text-brand-800") : "text-slate-700"}`}>
                      {name}
                    </span>
                    <span className="text-xs text-slate-500">{desc}</span>
                  </label>
                );
              })}
            </div>
            {productType === "required" && (
              <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                <span>Customers must upload their design image during checkout. Order will be blocked until they do.</span>
              </div>
            )}
          </div>

          {/* Basic Info */}
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Basic Info</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <Field label="Product Name" required>
              <input className="admin-input" placeholder="Product Name *" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Brand" hint="optional">
              <input className="admin-input" placeholder="Brand" value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </Field>
            <Field label="Category" required hint="select one">
              <select className="admin-input" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Description" required className="mb-4">
            <textarea
              className="admin-input h-20 resize-y"
              placeholder="Description *"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </Field>

          {/* Pricing & Stock */}
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 mt-2">Pricing & Stock</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
            <Field label="Selling Price" required hint="price customers pay">
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input className="admin-input pl-9" placeholder="Selling Price *" type="number"
                  value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              </div>
            </Field>
            <Field label="Original Price" hint="shows a discount">
              <input className="admin-input" placeholder="Original Price (discount)" type="number"
                value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} />
            </Field>
            <Field label="Stock" hint="units available">
              <input className="admin-input" placeholder="Stock" type="number"
                value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </Field>
            <Field label="Weight">
              <input className="admin-input" placeholder="Weight (e.g. 500g)"
                value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
            </Field>
          </div>
          {form.originalPrice && Number(form.originalPrice) > Number(form.price) && (
            <div className="mb-4 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-1">
              <Tag size={13} />
              Discount: {Math.round(((Number(form.originalPrice) - Number(form.price)) / Number(form.originalPrice)) * 100)}% off
            </div>
          )}

          {/* Highlights */}
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 mt-5">Key Highlights</p>
          <div className="flex gap-2 mb-2 items-end">
            <Field label="Highlight" hint="press Enter or Add" className="flex-1">
              <input
                className="admin-input"
                placeholder="e.g. Premium quality printing"
                value={hlInput}
                onChange={(e) => setHlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHighlight(); } }}
              />
            </Field>
            <button type="button" onClick={addHighlight}
              className="admin-btn admin-btn-primary !py-1.5 !px-4 !text-sm flex-shrink-0">Add</button>
          </div>
          {highlights.length > 0 && (
            <ul className="mb-3 space-y-1.5">
              {highlights.map((h, i) => (
                <li key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-700">
                  <Check size={13} className="text-emerald-500 shrink-0" />
                  <span className="flex-1">{h}</span>
                  <button type="button" onClick={() => setHighlights((hl) => hl.filter((_, j) => j !== i))}
                    className="text-brand-400 hover:text-brand-600 transition-colors">
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Specifications */}
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 mt-5">Product Specifications</p>
          <div className="flex gap-2 mb-2 items-end">
            <Field label="Property" className="flex-1">
              <input className="admin-input" placeholder="Property (e.g. Material)" value={specKey}
                onChange={(e) => setSpecKey(e.target.value)} />
            </Field>
            <Field label="Value" className="flex-1">
              <input className="admin-input" placeholder="Value (e.g. 100% Cotton)" value={specVal}
                onChange={(e) => setSpecVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSpec(); } }}
              />
            </Field>
            <button type="button" onClick={addSpec}
              className="admin-btn admin-btn-primary !py-1.5 !px-4 !text-sm flex-shrink-0">Add</button>
          </div>
          {specifications.length > 0 && (
            <div className="mb-4 border border-slate-200 rounded-xl overflow-hidden">
              {specifications.map((sp, i) => (
                <div key={i} className={`flex items-center gap-3 px-3 py-2.5 text-sm ${i % 2 === 0 ? "bg-slate-50" : "bg-white"}`}>
                  <span className="font-semibold text-slate-600 w-36 shrink-0">{sp.key}</span>
                  <span className="text-slate-700 flex-1">{sp.value}</span>
                  <button type="button" onClick={() => setSpecifications((s) => s.filter((_, j) => j !== i))}
                    className="text-brand-400 hover:text-brand-600 transition-colors">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}


          {/* Availability + COD */}
          <div className="flex flex-col sm:flex-row gap-4 mb-5">
            <label className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer select-none w-fit group">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all
                               ${form.isAvailable ? "bg-brand-600 border-brand-600" : "border-slate-300 bg-white"}`}>
                {form.isAvailable && <Check size={10} className="text-white" strokeWidth={3} />}
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={form.isAvailable}
                onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
              />
              Available to customers
            </label>

            <label className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer select-none w-fit group">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all
                               ${form.allowCOD ? "bg-emerald-600 border-emerald-600" : "border-slate-300 bg-white"}`}>
                {form.allowCOD && <Check size={10} className="text-white" strokeWidth={3} />}
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={form.allowCOD}
                onChange={(e) => setForm({ ...form, allowCOD: e.target.checked })}
              />
              💵 Allow Cash on Delivery
              <span className="text-[11px] text-slate-400 font-normal">(uncheck for customisable items)</span>
            </label>
          </div>

          {/* Sizes — only relevant for sized products like clothing */}
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 mt-2">Available Sizes <span className="normal-case font-normal text-slate-400">(optional — e.g. T-shirts)</span></p>
          <div className="flex flex-wrap gap-2 mb-2">
            {["XS", "S", "M", "L", "XL", "XXL", "XXXL"].map((s) => {
              const active = sizes.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => active ? setSizes((p) => p.filter((x) => x !== s)) : addSizePreset(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                    active
                      ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-brand-300"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 mb-2 items-end">
            <Field label="Custom Size" className="flex-1 max-w-xs">
              <input
                className="admin-input"
                placeholder="Add custom size (e.g. 32, 34, Free Size)"
                value={sizeInput}
                onChange={(e) => setSizeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSize(); } }}
              />
            </Field>
            <button type="button" onClick={addSize}
              className="admin-btn admin-btn-primary !py-1.5 !px-4 !text-sm flex-shrink-0">Add</button>
          </div>
          {sizes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {sizes.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 border border-brand-100 text-xs font-bold px-2.5 py-1 rounded-full">
                  {s}
                  <button type="button"
                    onClick={() => setSizes((p) => p.filter((x) => x !== s))}
                    className="text-brand-400 hover:text-brand-600 transition-colors">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Images — upload from device OR paste URL (up to 10) */}
          <div className="mb-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
              Product Images <span className="normal-case font-normal text-slate-400">(up to 10 — upload or paste URLs)</span>
            </p>
            {/* Uploads are filed under products/<category>/<product>/ on the
                server, so filling in the name and category first files them
                straight away — otherwise the server moves them there when the
                product is saved. */}
            <p className="text-[11px] text-slate-400 -mt-1 mb-3">
              {form.name.trim()
                ? <>Images are stored in <code className="text-slate-500">products/{folderSlug(form.category) || "uncategorized"}/{folderSlug(form.name)}/</code></>
                : "Tip: fill in the product name and category first — each product keeps its images in a folder of its own."}
            </p>
            <MultiImageInput
              value={images}
              onChange={setImages}
              max={10}
              folder="products"
              category={form.category}
              product={form.name}
            />
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="admin-btn admin-btn-primary disabled:opacity-60">
              {loading ? "Saving…" : editId ? "Update Product" : "Create Product"}
            </button>
            <button type="button" onClick={resetForm} className="admin-btn admin-btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Product Table ─────────────────────────────── */}
      {loading && !showForm ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-brand-600 animate-spin" />
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  {["Image", "Name", "Brand", "Category", "Type", "Price", "Stock", "Status", "Actions"].map((h) => (
                    <th key={h} className="th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const badge     = typeBadge(p);
                  const imgs      = p.images?.length ? p.images : p.image ? [p.image] : [];
                  const hasDiscount = p.originalPrice > 0 && p.originalPrice > p.price;
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="td">
                        <div className="flex gap-1.5">
                          {imgs.slice(0, 2).map((img, i) => (
                            <img key={i} src={img} alt={p.name}
                              className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                              style={{ opacity: i === 0 ? 1 : 0.45 }}
                            />
                          ))}
                          {imgs.length === 0 && (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300">
                              <Image size={16} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="td font-semibold text-slate-800 max-w-[160px]">
                        <p className="truncate">{p.name}</p>
                        {p.sku && <p className="text-[11px] text-slate-400 font-normal">{p.sku}</p>}
                      </td>
                      <td className="td text-slate-500 text-xs">{p.brand || "—"}</td>
                      <td className="td">
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-xs
                                         font-semibold px-2.5 py-1 rounded-full">
                          <Tag size={10} />
                          {p.category}
                        </span>
                      </td>
                      <td className="td">
                        <span className={`status-badge ${badge.cls}`}>{badge.label}</span>
                      </td>
                      <td className="td">
                        <p className="font-bold text-slate-800">₹{p.price}</p>
                        {hasDiscount && (
                          <p className="text-[11px] text-emerald-600 font-medium">
                            {Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}% off
                          </p>
                        )}
                      </td>
                      <td className="td text-slate-600 font-medium">{p.stock}</td>
                      <td className="td">
                        <span className={`flex items-center gap-1.5 text-xs font-semibold
                                          ${p.isAvailable ? "text-emerald-600" : "text-slate-400"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.isAvailable ? "bg-emerald-500" : "bg-slate-300"}`} />
                          {p.isAvailable ? "Active" : "Hidden"}
                        </span>
                      </td>
                      <td className="td">
                        <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                       bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold
                                       transition-colors"
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(p._id, p.name)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                       bg-brand-50 hover:bg-brand-100 text-brand-600 text-xs font-semibold
                                       transition-colors"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredProducts.length === 0 && (searchTerm || categoryTab !== "all") && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <PackageX size={40} className="mb-3 opacity-40" />
                <p className="font-semibold text-slate-500">No products match your filters.</p>
                <p className="text-sm mt-1">Try changing the category or search term.</p>
              </div>
            )}
            {products.length === 0 && !searchTerm && categoryTab === "all" && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Box size={40} className="mb-3 opacity-40" />
                <p className="font-semibold text-slate-500">No products yet.</p>
                <p className="text-sm mt-1">Click "+ Add Product" to create your first product.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
