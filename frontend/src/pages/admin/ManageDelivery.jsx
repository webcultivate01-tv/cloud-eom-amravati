import { confirmDialog } from "../../components/ConfirmDialog";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import api from "../../utils/api";

const EMPTY_FORM = { pincode: "", area: "", charge: "", chargeType: "per_order", isActive: true };

const TYPE_LABEL = { per_unit: "Per unit", per_order: "Per order (flat)" };

const errMsg = (err, fallback) => err?.response?.data?.message || fallback;

export default function ManageDelivery() {
  const [zones, setZones]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [search, setSearch]     = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/delivery");
      setZones(data);
    } catch (err) {
      toast.error(errMsg(err, "Failed to load delivery rates"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(false); };

  const handleEdit = (z) => {
    setEditId(z._id);
    setForm({ pincode: z.pincode, area: z.area || "", charge: String(z.charge), chargeType: z.chargeType, isActive: z.isActive });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(form.pincode)) return toast.error("Enter a valid 6-digit pincode");
    if (form.charge === "" || Number(form.charge) < 0) return toast.error("Enter the delivery charge (0 for free delivery)");
    setSaving(true);
    try {
      const payload = { ...form, charge: Number(form.charge) };
      if (editId) await api.put(`/delivery/${editId}`, payload);
      else await api.post("/delivery", payload);
      toast.success(editId ? "Delivery rate updated!" : "Delivery rate added!");
      resetForm();
      await load();
    } catch (err) {
      toast.error(errMsg(err, "Failed to save delivery rate"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (z) => {
    if (!(await confirmDialog(`Delete the delivery rate for ${z.pincode}?`))) return;
    try {
      await api.delete(`/delivery/${z._id}`);
      toast.success("Delivery rate deleted");
      await load();
    } catch (err) {
      toast.error(errMsg(err, "Failed to delete delivery rate"));
    }
  };

  const handleToggle = async (z) => {
    try {
      await api.put(`/delivery/${z._id}`, { isActive: !z.isActive });
      await load();
    } catch (err) {
      toast.error(errMsg(err, "Failed to update delivery rate"));
    }
  };

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? zones.filter((z) => z.pincode.includes(q) || (z.area || "").toLowerCase().includes(q)) : zones;
  }, [zones, search]);

  const example = Number(form.charge) > 0
    ? form.chargeType === "per_unit"
      ? `An order of 3 items pays ₹${(Number(form.charge) * 3).toLocaleString("en-IN")} delivery (₹${Number(form.charge).toLocaleString("en-IN")} × 3).`
      : `Any order pays ₹${Number(form.charge).toLocaleString("en-IN")} delivery, whatever the quantity.`
    : form.charge !== "" ? "Delivery is free for this pincode." : "";

  return (
    <div className="animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Delivery Charges</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {zones.length} pincode{zones.length !== 1 ? "s" : ""} · charged per unit or as a flat amount per order
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm((v) => !v); }}
          className={`admin-btn ${showForm ? "admin-btn-ghost" : "admin-btn-primary"}`}
        >
          {showForm ? "✕ Cancel" : "+ Add Pincode"}
        </button>
      </div>

      <div className="admin-card p-4 mb-6 text-[13px] text-slate-500 leading-relaxed">
        Customers see the rate for their delivery pincode at checkout. Pincodes not listed here fall back to the
        per-unit delivery charge set on each product (free if none).
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="admin-card p-6 mb-6 animate-fade-in-up flex flex-col gap-4">
          <h2 className="text-base font-bold text-slate-800">{editId ? "Edit Delivery Rate" : "New Delivery Rate"}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Pincode *</label>
              <input className="admin-input" placeholder="444601" inputMode="numeric" maxLength={6}
                     value={form.pincode} disabled={!!editId}
                     onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "") })} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Area <span className="normal-case font-normal">(optional)</span></label>
              <input className="admin-input" placeholder="Amravati city" value={form.area}
                     onChange={(e) => setForm({ ...form, area: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Charge (₹) *</label>
              <input className="admin-input" type="number" min="0" step="0.01" placeholder="0 = free" value={form.charge}
                     onChange={(e) => setForm({ ...form, charge: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Charge applies</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(TYPE_LABEL).map(([value, label]) => (
                <label key={value}
                       className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border cursor-pointer text-sm font-semibold select-none ${
                         form.chargeType === value ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600"}`}>
                  <input type="radio" name="chargeType" className="accent-brand-600" checked={form.chargeType === value}
                         onChange={() => setForm({ ...form, chargeType: value })} />
                  {label}
                </label>
              ))}
            </div>
            {example && <p className="text-[12px] text-slate-400 mt-2 m-0">{example}</p>}
          </div>

          <label className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer select-none">
            <input type="checkbox" className="w-4 h-4 rounded accent-brand-600" checked={form.isActive}
                   onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Active
          </label>

          <div>
            <button type="submit" disabled={saving} className="admin-btn admin-btn-primary disabled:opacity-60">
              {saving ? "Saving…" : editId ? "Update Rate" : "Add Rate"}
            </button>
          </div>
        </form>
      )}

      {zones.length > 0 && (
        <input className="admin-input mb-3 max-w-xs" placeholder="Search pincode or area…" value={search}
               onChange={(e) => setSearch(e.target.value)} />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
            <div className="absolute inset-0 rounded-full border-4 border-t-brand-600 animate-spin" />
          </div>
        </div>
      ) : zones.length === 0 ? (
        <div className="admin-card p-16 text-center">
          <p className="text-4xl mb-3">🚚</p>
          <p className="text-slate-500 font-medium">No pincode rates yet.</p>
          <p className="text-slate-400 text-sm mt-1">Add a pincode with its delivery charge to start charging by location.</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="admin-card p-8 text-center text-slate-400 text-sm">No pincode matches your search.</div>
      ) : (
        <div className="admin-card divide-y divide-slate-100">
          {shown.map((z) => (
            <div key={z._id} className={`flex flex-wrap items-center gap-3 p-4 ${z.isActive ? "" : "opacity-60"}`}>
              <div className="min-w-[120px]">
                <p className="font-black text-slate-800 tracking-wide m-0">{z.pincode}</p>
                {z.area && <p className="text-xs text-slate-400 m-0">{z.area}</p>}
              </div>
              <div className="flex-1 min-w-[140px]">
                <p className="font-bold text-slate-800 m-0">
                  {z.charge > 0 ? `₹${z.charge.toLocaleString("en-IN")}` : "Free"}
                  {z.charge > 0 && <span className="text-slate-400 font-medium text-sm"> {z.chargeType === "per_unit" ? "per unit" : "per order"}</span>}
                </p>
                {!z.isActive && <p className="text-[11px] text-slate-400 m-0">Inactive — not applied</p>}
              </div>
              <button onClick={() => handleEdit(z)} className="admin-btn bg-brand-50 hover:bg-brand-100 text-brand-700 !py-1.5 !px-3 !text-xs">✏️ Edit</button>
              <button onClick={() => handleToggle(z)}
                      className={`admin-btn !py-1.5 !px-3 !text-xs ${z.isActive ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700" : "bg-brand-50 hover:bg-brand-100 text-brand-500"}`}>
                {z.isActive ? "✓ Active" : "🚫 Inactive"}
              </button>
              <button onClick={() => handleDelete(z)} className="admin-btn bg-brand-50 hover:bg-brand-100 text-brand-600 !py-1.5 !px-3 !text-xs">🗑 Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
