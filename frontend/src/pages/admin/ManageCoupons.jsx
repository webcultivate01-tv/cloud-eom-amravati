import { confirmDialog } from "../../components/ConfirmDialog";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import api from "../../utils/api";

const EMPTY_FORM = {
  code: "", description: "",
  discountType: "percentage", discountValue: "", maxDiscount: "",
  minOrderValue: "", startsAt: "", expiresAt: "",
  usageLimit: "", perUserLimit: "",
  applicableTo: "all", products: [], categories: [],
  newCustomersOnly: false, isActive: true,
};

const STATE_BADGE = {
  active:    { label: "Active",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  scheduled: { label: "Scheduled", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  expired:   { label: "Expired",   cls: "bg-slate-100 text-slate-500 border-slate-200" },
  exhausted: { label: "Used up",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
  inactive:  { label: "Inactive",  cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "scheduled", label: "Scheduled" },
  { key: "expired", label: "Expired" },
  { key: "inactive", label: "Inactive" },
];

const LABEL = "text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5";
const HINT = "text-[11px] text-slate-400 mt-1 m-0";

const errMsg = (err, fallback) => err?.response?.data?.message || fallback;
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (d) => new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

/* <input type="datetime-local"> wants local time as YYYY-MM-DDTHH:mm */
const toLocalInput = (d) => {
  if (!d) return "";
  const date = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const randomCode = () => {
  // No 0/O/1/I so a code read out over the phone isn't misheard
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const discountLabel = (c) =>
  c.discountType === "percentage"
    ? `${c.discountValue}% off${c.maxDiscount > 0 ? ` (up to ${inr(c.maxDiscount)})` : ""}`
    : `${inr(c.discountValue)} off`;

const scopeLabel = (c) => {
  if (c.applicableTo === "products") return `${c.products.length} selected product${c.products.length !== 1 ? "s" : ""}`;
  if (c.applicableTo === "categories") return c.categories.join(", ");
  return "All products";
};

export default function ManageCoupons() {
  const [coupons, setCoupons]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("all");

  // Pickers for "applies to" — loaded the first time they're needed
  const [allProducts, setAllProducts]     = useState(null);
  const [allCategories, setAllCategories] = useState(null);
  const [productSearch, setProductSearch] = useState("");

  // Usage history, opened per coupon
  const [usageFor, setUsageFor]   = useState(null);
  const [usage, setUsage]         = useState([]);
  const [usageLoading, setUsageLoading] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/coupons");
      setCoupons(data);
    } catch (err) {
      toast.error(errMsg(err, "Failed to load coupons"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!showForm) return;
    if (form.applicableTo === "products" && allProducts === null) {
      api.get("/products").then(({ data }) => setAllProducts(data)).catch(() => { setAllProducts([]); toast.error("Failed to load products"); });
    }
    if (form.applicableTo === "categories" && allCategories === null) {
      api.get("/categories").then(({ data }) => setAllCategories(data)).catch(() => { setAllCategories([]); toast.error("Failed to load categories"); });
    }
  }, [showForm, form.applicableTo, allProducts, allCategories]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const resetForm = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(false); setProductSearch(""); };

  const fillFrom = (c) => ({
    code: c.code, description: c.description || "",
    discountType: c.discountType, discountValue: String(c.discountValue),
    maxDiscount: c.maxDiscount > 0 ? String(c.maxDiscount) : "",
    minOrderValue: c.minOrderValue > 0 ? String(c.minOrderValue) : "",
    startsAt: toLocalInput(c.startsAt), expiresAt: toLocalInput(c.expiresAt),
    usageLimit: c.usageLimit > 0 ? String(c.usageLimit) : "",
    perUserLimit: c.perUserLimit > 0 ? String(c.perUserLimit) : "",
    applicableTo: c.applicableTo,
    products: (c.products || []).map((p) => ({ _id: p._id, name: p.name })),
    categories: c.categories || [],
    newCustomersOnly: !!c.newCustomersOnly, isActive: c.isActive,
  });

  const handleEdit = (c) => {
    setEditId(c._id);
    setForm(fillFrom(c));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDuplicate = (c) => {
    setEditId(null);
    setForm({ ...fillFrom(c), code: randomCode() });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.info("Duplicated — give it a new code and save");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editId && !/^[A-Z0-9_-]{3,20}$/.test(form.code.trim().toUpperCase())) {
      return toast.error("Code must be 3-20 characters: letters, numbers, - or _");
    }
    const value = Number(form.discountValue);
    if (!(value > 0)) return toast.error("Enter a discount greater than 0");
    if (form.discountType === "percentage" && value > 100) return toast.error("A percentage discount can't be more than 100%");
    if (form.startsAt && form.expiresAt && new Date(form.expiresAt) <= new Date(form.startsAt)) {
      return toast.error("The expiry must be after the start date");
    }
    if (form.applicableTo === "products" && form.products.length === 0) return toast.error("Pick at least one product");
    if (form.applicableTo === "categories" && form.categories.length === 0) return toast.error("Pick at least one category");

    setSaving(true);
    try {
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        discountValue: value,
        maxDiscount: form.discountType === "percentage" ? Number(form.maxDiscount) || 0 : 0,
        minOrderValue: Number(form.minOrderValue) || 0,
        usageLimit: Number(form.usageLimit) || 0,
        perUserLimit: Number(form.perUserLimit) || 0,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : "",
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : "",
        products: form.products.map((p) => p._id),
      };
      if (editId) {
        delete payload.code; // the code can't change once created
        await api.put(`/coupons/${editId}`, payload);
      } else {
        await api.post("/coupons", payload);
      }
      toast.success(editId ? "Coupon updated!" : "Coupon created!");
      resetForm();
      await load();
    } catch (err) {
      toast.error(errMsg(err, "Failed to save coupon"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (c) => {
    try {
      await api.put(`/coupons/${c._id}`, { isActive: !c.isActive });
      await load();
    } catch (err) {
      toast.error(errMsg(err, "Failed to update coupon"));
    }
  };

  const handleDelete = async (c) => {
    if (!(await confirmDialog(`Delete coupon ${c.code}?`))) return;
    try {
      await api.delete(`/coupons/${c._id}`);
      toast.success("Coupon deleted");
      await load();
    } catch (err) {
      toast.error(errMsg(err, "Failed to delete coupon"));
    }
  };

  const handleUsage = async (c) => {
    if (usageFor === c._id) { setUsageFor(null); return; }
    setUsageFor(c._id);
    setUsage([]);
    setUsageLoading(true);
    try {
      const { data } = await api.get(`/coupons/${c._id}/usage`);
      setUsage(data);
    } catch (err) {
      toast.error(errMsg(err, "Failed to load usage"));
    } finally {
      setUsageLoading(false);
    }
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`${code} copied`);
    } catch {
      toast.error("Could not copy the code");
    }
  };

  const counts = useMemo(() => {
    const acc = { all: coupons.length, active: 0, scheduled: 0, expired: 0, inactive: 0 };
    coupons.forEach((c) => {
      // "Used up" coupons sit with Expired — both are finished, neither can be redeemed
      const key = c.state === "exhausted" ? "expired" : c.state;
      acc[key] += 1;
    });
    return acc;
  }, [coupons]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return coupons.filter((c) => {
      const key = c.state === "exhausted" ? "expired" : c.state;
      if (filter !== "all" && key !== filter) return false;
      return !q || c.code.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q);
    });
  }, [coupons, search, filter]);

  const visibleProducts = useMemo(() => {
    if (!allProducts) return [];
    const q = productSearch.trim().toLowerCase();
    return (q ? allProducts.filter((p) => p.name.toLowerCase().includes(q)) : allProducts).slice(0, 40);
  }, [allProducts, productSearch]);

  const toggleProduct = (p) =>
    set({
      products: form.products.some((x) => x._id === p._id)
        ? form.products.filter((x) => x._id !== p._id)
        : [...form.products, { _id: p._id, name: p.name }],
    });

  const toggleCategory = (name) =>
    set({ categories: form.categories.includes(name) ? form.categories.filter((c) => c !== name) : [...form.categories, name] });

  const example = (() => {
    const v = Number(form.discountValue);
    if (!(v > 0)) return "";
    if (form.discountType === "fixed") return `Takes ${inr(v)} off the product cost.`;
    const cap = Number(form.maxDiscount) > 0 ? `, up to ${inr(form.maxDiscount)}` : "";
    return `On a ₹1,000 order that's ${inr(Math.min((1000 * v) / 100, Number(form.maxDiscount) > 0 ? Number(form.maxDiscount) : Infinity))} off${cap}.`;
  })();

  return (
    <div className="animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Coupons</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {coupons.length} coupon{coupons.length !== 1 ? "s" : ""} · discount codes customers enter at checkout
          </p>
        </div>
        <button
          onClick={() => { if (showForm) resetForm(); else { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); } }}
          className={`admin-btn ${showForm ? "admin-btn-ghost" : "admin-btn-primary"}`}
        >
          {showForm ? "✕ Cancel" : "+ New Coupon"}
        </button>
      </div>

      <div className="admin-card p-4 mb-6 text-[13px] text-slate-500 leading-relaxed">
        A coupon takes money off the <strong className="text-slate-700">product cost</strong> — delivery charges are never discounted.
        The discount shows on the customer's order summary, the emails and the bill.
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="admin-card p-6 mb-6 animate-fade-in-up flex flex-col gap-5">
          <h2 className="text-base font-bold text-slate-800">{editId ? `Edit ${form.code}` : "New Coupon"}</h2>

          {/* Basics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Code *</label>
              <div className="flex gap-2">
                <input className="admin-input font-mono tracking-wider uppercase" placeholder="SAVE10" maxLength={20}
                       value={form.code} disabled={!!editId}
                       onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} />
                {!editId && (
                  <button type="button" className="admin-btn admin-btn-ghost shrink-0" onClick={() => set({ code: randomCode() })}>
                    🎲 Generate
                  </button>
                )}
              </div>
              <p className={HINT}>{editId ? "The code can't be changed once created." : "3-20 letters, numbers, - or _. Customers aren't bothered by upper/lower case."}</p>
            </div>
            <div>
              <label className={LABEL}>Description <span className="normal-case font-normal">(optional)</span></label>
              <input className="admin-input" placeholder="Diwali offer — 10% off" maxLength={200} value={form.description}
                     onChange={(e) => set({ description: e.target.value })} />
              <p className={HINT}>Shown to the customer when the coupon is applied.</p>
            </div>
          </div>

          {/* Discount */}
          <div>
            <label className={LABEL}>Discount</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {[["percentage", "Percentage (%)"], ["fixed", "Fixed amount (₹)"]].map(([value, label]) => (
                <label key={value}
                       className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border cursor-pointer text-sm font-semibold select-none ${
                         form.discountType === value ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600"}`}>
                  <input type="radio" name="discountType" className="accent-brand-600" checked={form.discountType === value}
                         onChange={() => set({ discountType: value })} />
                  {label}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={LABEL}>{form.discountType === "percentage" ? "Percent off *" : "Amount off (₹) *"}</label>
                <input className="admin-input" type="number" min="0" max={form.discountType === "percentage" ? 100 : undefined} step="0.01"
                       placeholder={form.discountType === "percentage" ? "10" : "200"} value={form.discountValue}
                       onChange={(e) => set({ discountValue: e.target.value })} />
              </div>
              {form.discountType === "percentage" && (
                <div>
                  <label className={LABEL}>Max discount (₹)</label>
                  <input className="admin-input" type="number" min="0" step="0.01" placeholder="0 = no cap" value={form.maxDiscount}
                         onChange={(e) => set({ maxDiscount: e.target.value })} />
                </div>
              )}
              <div>
                <label className={LABEL}>Min order value (₹)</label>
                <input className="admin-input" type="number" min="0" step="0.01" placeholder="0 = none" value={form.minOrderValue}
                       onChange={(e) => set({ minOrderValue: e.target.value })} />
              </div>
            </div>
            {example && <p className={HINT}>{example}</p>}
          </div>

          {/* Validity + limits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className={LABEL}>Starts</label>
              <input className="admin-input" type="datetime-local" value={form.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
              <p className={HINT}>Empty = starts now</p>
            </div>
            <div>
              <label className={LABEL}>Expires</label>
              <input className="admin-input" type="datetime-local" value={form.expiresAt} onChange={(e) => set({ expiresAt: e.target.value })} />
              <p className={HINT}>Empty = never expires</p>
            </div>
            <div>
              <label className={LABEL}>Total uses</label>
              <input className="admin-input" type="number" min="0" step="1" placeholder="0 = unlimited" value={form.usageLimit}
                     onChange={(e) => set({ usageLimit: e.target.value })} />
              <p className={HINT}>Across all customers</p>
            </div>
            <div>
              <label className={LABEL}>Uses per customer</label>
              <input className="admin-input" type="number" min="0" step="1" placeholder="0 = unlimited" value={form.perUserLimit}
                     onChange={(e) => set({ perUserLimit: e.target.value })} />
              <p className={HINT}>Cancelled orders don't count</p>
            </div>
          </div>

          {/* Applies to */}
          <div>
            <label className={LABEL}>Applies to</label>
            <div className="flex flex-wrap gap-2">
              {[["all", "All products"], ["categories", "Specific categories"], ["products", "Specific products"]].map(([value, label]) => (
                <label key={value}
                       className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border cursor-pointer text-sm font-semibold select-none ${
                         form.applicableTo === value ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600"}`}>
                  <input type="radio" name="applicableTo" className="accent-brand-600" checked={form.applicableTo === value}
                         onChange={() => set({ applicableTo: value })} />
                  {label}
                </label>
              ))}
            </div>

            {form.applicableTo === "categories" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {allCategories === null ? <span className="text-sm text-slate-400">Loading categories…</span>
                  : allCategories.length === 0 ? <span className="text-sm text-slate-400">No categories found.</span>
                  : allCategories.map((cat) => (
                    <label key={cat._id}
                           className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer text-[13px] font-semibold select-none ${
                             form.categories.includes(cat.name) ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600"}`}>
                      <input type="checkbox" className="accent-brand-600" checked={form.categories.includes(cat.name)}
                             onChange={() => toggleCategory(cat.name)} />
                      {cat.name}
                    </label>
                  ))}
                {/* Categories on the coupon that are no longer listed (renamed / switched off) stay visible so they can be removed */}
                {allCategories && form.categories.filter((n) => !allCategories.some((c) => c.name === n)).map((n) => (
                  <label key={n} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 cursor-pointer text-[13px] font-semibold select-none">
                    <input type="checkbox" className="accent-brand-600" checked onChange={() => toggleCategory(n)} />
                    {n} <span className="font-normal">(not listed)</span>
                  </label>
                ))}
              </div>
            )}

            {form.applicableTo === "products" && (
              <div className="mt-3">
                {form.products.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {form.products.map((p) => (
                      <span key={p._id} className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-700 border border-brand-100 rounded-full pl-3 pr-1.5 py-1 text-xs font-semibold">
                        {p.name}
                        <button type="button" onClick={() => toggleProduct(p)} aria-label={`Remove ${p.name}`}
                                className="w-4 h-4 rounded-full bg-brand-100 hover:bg-brand-200 text-brand-700 border-none cursor-pointer leading-none text-[10px]">✕</button>
                      </span>
                    ))}
                  </div>
                )}
                <input className="admin-input mb-2 max-w-sm" placeholder="Search products…" value={productSearch}
                       onChange={(e) => setProductSearch(e.target.value)} />
                <div className="border border-slate-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {allProducts === null ? <p className="p-3 text-sm text-slate-400 m-0">Loading products…</p>
                    : visibleProducts.length === 0 ? <p className="p-3 text-sm text-slate-400 m-0">No product matches.</p>
                    : visibleProducts.map((p) => (
                      <label key={p._id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-slate-50 text-sm text-slate-700">
                        <input type="checkbox" className="accent-brand-600" checked={form.products.some((x) => x._id === p._id)} onChange={() => toggleProduct(p)} />
                        <span className="flex-1 min-w-0 truncate">{p.name}</span>
                        <span className="text-xs text-slate-400 shrink-0">{p.category}</span>
                      </label>
                    ))}
                </div>
                <p className={HINT}>The discount is worked out only on the selected products in the cart.</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <label className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer select-none">
              <input type="checkbox" className="w-4 h-4 rounded accent-brand-600" checked={form.newCustomersOnly}
                     onChange={(e) => set({ newCustomersOnly: e.target.checked })} />
              New customers only <span className="text-slate-400 text-xs">(no earlier order)</span>
            </label>
            <label className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer select-none">
              <input type="checkbox" className="w-4 h-4 rounded accent-brand-600" checked={form.isActive}
                     onChange={(e) => set({ isActive: e.target.checked })} />
              Active
            </label>
          </div>

          <div>
            <button type="submit" disabled={saving} className="admin-btn admin-btn-primary disabled:opacity-60">
              {saving ? "Saving…" : editId ? "Update Coupon" : "Create Coupon"}
            </button>
          </div>
        </form>
      )}

      {coupons.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer transition-colors ${
                      filter === f.key ? "bg-brand-600 text-white border-brand-600" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}>
              {f.label} <span className={filter === f.key ? "text-white/80" : "text-slate-400"}>{counts[f.key]}</span>
            </button>
          ))}
          <input className="admin-input max-w-xs ml-auto" placeholder="Search code or description…" value={search}
                 onChange={(e) => setSearch(e.target.value)} />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
            <div className="absolute inset-0 rounded-full border-4 border-t-brand-600 animate-spin" />
          </div>
        </div>
      ) : coupons.length === 0 ? (
        <div className="admin-card p-16 text-center">
          <p className="text-4xl mb-3">🎟️</p>
          <p className="text-slate-500 font-medium">No coupons yet.</p>
          <p className="text-slate-400 text-sm mt-1">Create a code and customers can use it at checkout.</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="admin-card p-8 text-center text-slate-400 text-sm">No coupon matches your filter.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((c) => {
            const badge = STATE_BADGE[c.state] || STATE_BADGE.inactive;
            const pct = c.usageLimit > 0 ? Math.min(100, Math.round((c.usedCount / c.usageLimit) * 100)) : 0;
            return (
              <div key={c._id} className={`admin-card overflow-hidden ${c.state === "inactive" || c.state === "expired" ? "opacity-75" : ""}`}>
                <div className="flex flex-wrap items-start gap-4 p-4">
                  <div className="min-w-[150px]">
                    <div className="flex items-center gap-2">
                      <p className="font-mono font-black text-slate-800 tracking-wider text-[15px] m-0">{c.code}</p>
                      <button onClick={() => copyCode(c.code)} title="Copy code" aria-label={`Copy ${c.code}`}
                              className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer text-sm p-0">📋</button>
                    </div>
                    <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badge.cls}`}>{badge.label}</span>
                  </div>

                  <div className="flex-1 min-w-[220px]">
                    <p className="font-bold text-slate-800 m-0">{discountLabel(c)}</p>
                    {c.description && <p className="text-xs text-slate-500 m-0 mt-0.5">{c.description}</p>}
                    <p className="text-[11.5px] text-slate-400 m-0 mt-1.5 leading-relaxed">
                      {[
                        c.minOrderValue > 0 ? `Min order ${inr(c.minOrderValue)}` : null,
                        c.perUserLimit > 0 ? `${c.perUserLimit} per customer` : null,
                        c.newCustomersOnly ? "New customers only" : null,
                        scopeLabel(c),
                      ].filter(Boolean).join(" · ")}
                    </p>
                    <p className="text-[11.5px] text-slate-400 m-0 mt-0.5">
                      {c.startsAt ? `From ${fmtDate(c.startsAt)}` : "Starts immediately"} · {c.expiresAt ? `until ${fmtDate(c.expiresAt)}` : "no expiry"}
                    </p>
                  </div>

                  <div className="min-w-[150px]">
                    <p className="text-sm font-bold text-slate-700 m-0">
                      {c.usedCount}{c.usageLimit > 0 ? ` / ${c.usageLimit}` : ""} <span className="font-medium text-slate-400">used</span>
                    </p>
                    {c.usageLimit > 0 && (
                      <div className="h-1.5 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${pct >= 90 ? "bg-amber-500" : "bg-brand-500"}`} style={{ width: `${pct}%` }} />
                      </div>
                    )}
                    <p className="text-[11.5px] text-slate-400 m-0 mt-1.5">
                      {inr(c.stats.discount)} given · {inr(c.stats.revenue)} sales
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50/60">
                  <button onClick={() => handleEdit(c)} className="admin-btn bg-brand-50 hover:bg-brand-100 text-brand-700 !py-1.5 !px-3 !text-xs">✏️ Edit</button>
                  <button onClick={() => handleToggle(c)}
                          className={`admin-btn !py-1.5 !px-3 !text-xs ${c.isActive ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700" : "bg-brand-50 hover:bg-brand-100 text-brand-500"}`}>
                    {c.isActive ? "✓ Active" : "🚫 Inactive"}
                  </button>
                  <button onClick={() => handleUsage(c)} className="admin-btn bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 !py-1.5 !px-3 !text-xs">
                    📊 Usage ({c.stats.orders})
                  </button>
                  <button onClick={() => handleDuplicate(c)} className="admin-btn bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 !py-1.5 !px-3 !text-xs">⧉ Duplicate</button>
                  <button onClick={() => handleDelete(c)} className="admin-btn bg-brand-50 hover:bg-brand-100 text-brand-600 !py-1.5 !px-3 !text-xs ml-auto">🗑 Delete</button>
                </div>

                {usageFor === c._id && (
                  <div className="border-t border-slate-100 px-4 py-3">
                    {usageLoading ? (
                      <p className="text-sm text-slate-400 m-0">Loading…</p>
                    ) : usage.length === 0 ? (
                      <p className="text-sm text-slate-400 m-0">No orders have used this coupon yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px]">
                          <thead>
                            <tr className="text-[11px] uppercase tracking-wider text-slate-400">
                              <th className="py-1.5 pr-4 font-bold">Order</th>
                              <th className="py-1.5 pr-4 font-bold">Customer</th>
                              <th className="py-1.5 pr-4 font-bold">Date</th>
                              <th className="py-1.5 pr-4 font-bold text-right">Discount</th>
                              <th className="py-1.5 pr-4 font-bold text-right">Order total</th>
                              <th className="py-1.5 font-bold">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {usage.map((o) => (
                              <tr key={o._id} className={o.status === "Cancelled" ? "text-slate-400 line-through" : "text-slate-700"}>
                                <td className="py-2 pr-4 font-semibold">{o.orderNumber || o._id.slice(-8).toUpperCase()}</td>
                                <td className="py-2 pr-4">{o.user?.name || "—"}</td>
                                <td className="py-2 pr-4 whitespace-nowrap">{fmtDate(o.createdAt)}</td>
                                <td className="py-2 pr-4 text-right">{inr(o.discount)}</td>
                                <td className="py-2 pr-4 text-right">{inr(o.totalPrice)}</td>
                                <td className="py-2 no-underline">{o.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
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
