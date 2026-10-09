import { confirmDialog } from "../../components/ConfirmDialog";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllAdmins,
  createAdmin,
  updateAdminRole,
  removeAdmin,
} from "../../features/users/userSlice";
import { toast } from "react-toastify";

const EMPTY_FORM = { name: "", email: "", password: "", phone: "", adminRole: "subAdmin" };

const AVATAR_GRADIENTS = [
  "from-brand-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-sky-600",
];
const avatarGradient = (name) =>
  AVATAR_GRADIENTS[(name?.charCodeAt(0) ?? 0) % AVATAR_GRADIENTS.length];

const EyeIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

export default function ManageAdmins() {
  const dispatch = useDispatch();
  const { admins, loading } = useSelector((state) => state.users);
  const { user: currentUser } = useSelector((state) => state.auth);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => { dispatch(fetchAllAdmins()); }, [dispatch]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    const result = await dispatch(createAdmin(form));
    if (!result.error) {
      toast.success(`Admin "${form.name}" created!`);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } else {
      toast.error(result.payload);
    }
  };

  const handleRoleChange = async (id, adminRole) => {
    const result = await dispatch(updateAdminRole({ id, adminRole }));
    if (!result.error) toast.success("Role updated");
    else toast.error(result.payload);
  };

  const handleRemove = async (admin) => {
    if (!(await confirmDialog(`Remove "${admin.name}" from admins? They will become a regular user.`))) return;
    const result = await dispatch(removeAdmin(admin._id));
    if (!result.error) toast.success(`${admin.name} removed from admin`);
    else toast.error(result.payload);
  };

  return (
    <div className="animate-fade-in-up">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Admin Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">{admins.length} admin accounts</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setShowForm((v) => !v); }}
          className={`admin-btn ${showForm ? "admin-btn-ghost" : "admin-btn-primary"}`}
        >
          {showForm ? "✕ Cancel" : "+ Add Admin"}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="admin-card p-6 mb-6 animate-fade-in-up">
          <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center text-sm">🔐</span>
            Create New Admin Account
          </h2>
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <input
                className="admin-input" placeholder="Full Name"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
              />
              <input
                className="admin-input" type="email" placeholder="Email Address"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required
              />
              <div className="relative">
                <input
                  className="admin-input !pr-10"
                  type={showPass ? "text" : "password"}
                  placeholder="Password (min 6)"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <EyeIcon />
                </button>
              </div>
              <input
                className="admin-input" placeholder="Phone (optional)"
                value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            {/* Role selector */}
            <div className="mb-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Admin Role</p>
              <div className="flex flex-wrap gap-3">
                {[
                  { value: "subAdmin",   icon: "👤", label: "Sub Admin",   desc: "Limited access — cannot manage other admins", cls: "border-brand-400 bg-brand-50" },
                  { value: "superAdmin", icon: "⭐", label: "Super Admin", desc: "Full access — can manage all admins and settings", cls: "border-amber-400 bg-amber-50" },
                ].map(({ value, icon, label, desc, cls }) => (
                  <label
                    key={value}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all select-none flex-1 min-w-[200px] ${
                      form.adminRole === value ? `${cls} shadow-sm` : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
                    }`}
                  >
                    <input type="radio" name="adminRole" className="hidden" value={value}
                      checked={form.adminRole === value}
                      onChange={() => setForm({ ...form, adminRole: value })} />
                    <span className="text-xl mt-0.5">{icon}</span>
                    <div>
                      <p className={`font-bold text-sm ${form.adminRole === value ? (value === "superAdmin" ? "text-amber-800" : "text-brand-800") : "text-slate-700"}`}>{label}</p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-snug">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} className="admin-btn admin-btn-primary disabled:opacity-60">
              {loading ? "Creating…" : "Create Admin"}
            </button>
          </form>
        </div>
      )}

      {/* Role Legend */}
      <div className="flex flex-wrap gap-4 bg-white border border-slate-100 rounded-xl px-4 py-3 mb-5 shadow-card">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="status-badge bg-amber-100 text-amber-700">⭐ Super Admin</span>
          <span>Full access — can manage other admins</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="status-badge bg-brand-100 text-brand-700">👤 Sub Admin</span>
          <span>Limited access — cannot manage other admins</span>
        </div>
      </div>

      {/* Table */}
      {loading && !showForm ? (
        <div className="flex items-center justify-center py-24">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
            <div className="absolute inset-0 rounded-full border-4 border-t-brand-600 animate-spin" />
          </div>
        </div>
      ) : admins.length === 0 ? (
        <div className="admin-card p-16 text-center">
          <p className="text-4xl mb-3">🔐</p>
          <p className="text-slate-500 font-medium">No admins yet.</p>
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Admin", "Email", "Phone", "Role", "Joined", "Actions"].map((h) => (
                    <th key={h} className="th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {admins.map((admin) => {
                  const isSelf = admin._id === currentUser?._id;
                  return (
                    <tr key={admin._id} className={`transition-colors ${isSelf ? "bg-brand-50/40" : "hover:bg-slate-50/80"}`}>
                      <td className="td">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br ${avatarGradient(admin.name)} text-white flex items-center justify-center font-bold text-sm shadow-sm`}>
                            {admin.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 leading-tight">{admin.name}</p>
                            {isSelf && (
                              <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">You</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="td text-slate-500">{admin.email}</td>
                      <td className="td text-slate-500">{admin.phone || <span className="text-slate-300">—</span>}</td>
                      <td className="td">
                        <span className={`status-badge ${
                          admin.adminRole === "superAdmin"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-brand-100 text-brand-700"
                        }`}>
                          {admin.adminRole === "superAdmin" ? "⭐ Super Admin" : "👤 Sub Admin"}
                        </span>
                      </td>
                      <td className="td text-slate-400 text-xs">
                        {new Date(admin.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                      </td>
                      <td className="td">
                        {isSelf ? (
                          <span className="text-xs text-slate-300 italic">Current session</span>
                        ) : (
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => handleRoleChange(admin._id, admin.adminRole === "superAdmin" ? "subAdmin" : "superAdmin")}
                              className="admin-btn bg-brand-50 hover:bg-brand-100 text-brand-700 !py-1.5 !px-3 !text-xs"
                            >
                              {admin.adminRole === "superAdmin" ? "↓ Make Sub Admin" : "↑ Make Super Admin"}
                            </button>
                            <button
                              onClick={() => handleRemove(admin)}
                              className="admin-btn bg-brand-50 hover:bg-brand-100 text-brand-600 !py-1.5 !px-3 !text-xs"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-400">
            {admins.length} admin account{admins.length !== 1 ? "s" : ""} total
          </div>
        </div>
      )}
    </div>
  );
}
