import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  UserCog, Plus, X, Eye, EyeOff, KeyRound, Pencil, Trash2, Ban, UserCheck,
  Copy, Check, Shield, Mail, Phone, MapPin, Search,
} from "lucide-react";
import {
  fetchEmployees, createEmployee, updateEmployee,
  toggleBlockEmployee, resetEmployeePassword, deleteEmployee,
} from "../../features/employees/employeeSlice";
import { GRANTABLE_MODULES, EMPLOYEE_ROLE_LABELS } from "../../utils/panel";
import { confirmDialog } from "../../components/ConfirmDialog";

/* The access picker is laid out by the same groups as the sidebar, so what the
   admin ticks here reads as the menu the employee will actually see. */
const MODULE_GROUPS = GRANTABLE_MODULES.reduce((acc, m) => {
  (acc[m.group] ||= []).push(m);
  return acc;
}, {});

const EMPTY_FORM = {
  name: "", email: "", password: "", phone: "", address: "",
  employeeRole: "manager", permissions: [],
};

/* A readable temporary password the admin can dictate over the phone —
   no lookalike characters, and never generated on the server so the plain
   text only ever exists on this screen and in the handover email. */
const suggestPassword = () => {
  const words = ["cloud", "print", "canvas", "banner", "studio", "graphic", "design", "frame"];
  const word = words[Math.floor(Math.random() * words.length)];
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return `${word.charAt(0).toUpperCase()}${word.slice(1)}@${digits}`;
};

const Avatar = ({ name }) => (
  <div
    aria-hidden="true"
    className="w-9 h-9 shrink-0 rounded-xl bg-brand-50 border border-brand-100
               text-brand-700 flex items-center justify-center font-bold text-sm"
  >
    {name?.[0]?.toUpperCase() || "?"}
  </div>
);

/* ── Module access picker ─────────────────────────────── */
const AccessPicker = ({ selected, onChange }) => {
  const all = GRANTABLE_MODULES.map((m) => m.key);
  const allOn = selected.length === all.length;

  const toggle = (key) =>
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);

  const toggleGroup = (modules) => {
    const keys = modules.map((m) => m.key);
    const everyOn = keys.every((k) => selected.includes(k));
    onChange(everyOn ? selected.filter((k) => !keys.includes(k)) : [...new Set([...selected, ...keys])]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Panel Access
          <span className="ml-2 text-slate-300 normal-case tracking-normal font-semibold">
            {selected.length} of {all.length} sections
          </span>
        </p>
        <button
          type="button"
          onClick={() => onChange(allOn ? [] : all)}
          className="text-[11px] font-bold text-brand-700 hover:underline"
        >
          {allOn ? "Clear all" : "Select all"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {Object.entries(MODULE_GROUPS).map(([group, modules]) => {
          const keys = modules.map((m) => m.key);
          const onCount = keys.filter((k) => selected.includes(k)).length;
          return (
            <div key={group} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-100">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest m-0">
                  {group}
                </p>
                <button
                  type="button"
                  onClick={() => toggleGroup(modules)}
                  className="text-[11px] font-bold text-slate-400 hover:text-brand-700"
                >
                  {onCount === keys.length ? "none" : "all"}
                </button>
              </div>
              <div className="p-1.5">
                {modules.map(({ key, label, icon: Icon }) => {
                  const on = selected.includes(key);
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer
                                  select-none transition-colors ${
                                    on ? "bg-brand-50" : "hover:bg-slate-50"
                                  }`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={on}
                        onChange={() => toggle(key)}
                      />
                      <span
                        className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center
                                    transition-colors ${
                                      on
                                        ? "bg-brand-600 border-brand-600 text-white"
                                        : "bg-white border-slate-300"
                                    }`}
                      >
                        {on && <Check size={11} strokeWidth={3} />}
                      </span>
                      <Icon size={14} className={on ? "text-brand-600" : "text-slate-400"} />
                      <span
                        className={`text-[13px] font-medium ${on ? "text-brand-800" : "text-slate-600"}`}
                      >
                        {label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── The password an admin has to hand over ───────────── */
const CredentialNotice = ({ employee, password, emailed, onDismiss }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${employee.email} / ${password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.info("Copy failed — select the password and copy it by hand");
    }
  };

  return (
    <div className="admin-card p-5 mb-6 border-l-4 border-l-emerald-500 animate-fade-in-up">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-slate-800 text-sm m-0 flex items-center gap-2">
            <KeyRound size={15} className="text-emerald-600" />
            Temporary password for {employee.name}
          </p>
          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
            {emailed
              ? "Sent to their email. "
              : "The email could not be sent, so pass it on yourself. "}
            This is the only time it is shown — they must replace it before the staff panel opens.
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <code className="px-3 py-2 rounded-lg bg-slate-900 text-emerald-300 text-sm font-mono tracking-wide">
              {password}
            </code>
            <button onClick={copy} className="admin-btn admin-btn-ghost !py-2 !px-3 !text-xs">
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span className="ml-1.5">{copied ? "Copied" : "Copy with email"}</span>
            </button>
          </div>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100
                     flex items-center justify-center border-none bg-transparent cursor-pointer"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};

export default function ManageEmployees() {
  const dispatch = useDispatch();
  const { items: employees, loading, saving } = useSelector((s) => s.employees);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPass, setShowPass] = useState(false);
  const [search, setSearch] = useState("");
  const [credential, setCredential] = useState(null);

  useEffect(() => { dispatch(fetchEmployees()); }, [dispatch]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.phone?.toLowerCase().includes(q)
    );
  }, [employees, search]);

  const blockedCount = employees.filter((e) => e.isBlocked).length;
  // Only one manager may exist — the server enforces it, this just hides the button.
  const hasManager = employees.length > 0;

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowPass(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, password: suggestPassword() });
    setShowForm(true);
  };

  const openEdit = (employee) => {
    setEditingId(employee._id);
    setForm({
      name: employee.name || "",
      email: employee.email || "",
      password: "",
      phone: employee.phone || "",
      address: employee.address || "",
      employeeRole: "manager",
      permissions: Array.isArray(employee.permissions) ? [...employee.permissions] : [],
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editingId) {
      const result = await dispatch(updateEmployee({
        id: editingId,
        name: form.name,
        phone: form.phone,
        address: form.address,
        permissions: form.permissions,
      }));
      if (result.error) return toast.error(result.payload);
      toast.success(`${form.name} updated`);
      closeForm();
      return;
    }

    if (form.password.length < 6) {
      return toast.error("Temporary password must be at least 6 characters");
    }

    const result = await dispatch(createEmployee(form));
    if (result.error) return toast.error(result.payload);

    const { employee, emailed } = result.payload;
    toast.success(`${employee.name} added as ${EMPLOYEE_ROLE_LABELS[employee.employeeRole] || "Manager"}`);
    // Shown once, right here — the server never stores or returns it again.
    setCredential({ employee, password: form.password, emailed });
    closeForm();
  };

  const handleToggleBlock = async (employee) => {
    const blocking = !employee.isBlocked;
    const ok = await confirmDialog({
      title: blocking ? `Block ${employee.name}?` : `Unblock ${employee.name}?`,
      message: blocking
        ? "They will be signed out and cannot log in until you unblock them. The account and its access are kept."
        : "They will be able to sign in again with the sections they already have.",
      confirmText: blocking ? "Block" : "Unblock",
      danger: blocking,
    });
    if (!ok) return;

    const result = await dispatch(toggleBlockEmployee(employee._id));
    if (result.error) return toast.error(result.payload);
    toast.success(result.payload.message);
  };

  const handleResetPassword = async (employee) => {
    const password = suggestPassword();
    const ok = await confirmDialog({
      title: `Reset the password for ${employee.name}?`,
      message:
        "Their current password stops working at once. A new temporary one is issued and emailed to them, and they must replace it on their next sign-in.",
      confirmText: "Reset password",
      danger: false,
    });
    if (!ok) return;

    const result = await dispatch(resetEmployeePassword({ id: employee._id, password }));
    if (result.error) return toast.error(result.payload);
    setCredential({ employee, password, emailed: result.payload.emailed });
    toast.success(result.payload.message);
  };

  const handleDelete = async (employee) => {
    const ok = await confirmDialog({
      title: `Remove ${employee.name}?`,
      message:
        "The account is deleted permanently. To suspend them temporarily instead, block them — that keeps the account and its access.",
      confirmText: "Delete permanently",
      danger: true,
    });
    if (!ok) return;

    const result = await dispatch(deleteEmployee(employee._id));
    if (result.error) return toast.error(result.payload);
    toast.success(`${employee.name} removed`);
  };

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Employee Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {employees.length} employee{employees.length === 1 ? "" : "s"}
            {blockedCount > 0 && ` · ${blockedCount} blocked`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              className="admin-input !pl-9 w-60"
              placeholder="Search employees…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {(showForm || !hasManager) && (
            <button
              onClick={() => (showForm ? closeForm() : openCreate())}
              className={`admin-btn ${showForm ? "admin-btn-ghost" : "admin-btn-primary"}`}
            >
              {showForm ? <X size={15} /> : <Plus size={15} />}
              <span className="ml-1.5">{showForm ? "Cancel" : "Add Manager"}</span>
            </button>
          )}
        </div>
      </div>

      {credential && (
        <CredentialNotice {...credential} onDismiss={() => setCredential(null)} />
      )}

      {/* Create / edit form */}
      {showForm && (
        <div className="admin-card p-6 mb-6 animate-fade-in-up">
          <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center">
              <UserCog size={15} />
            </span>
            {editingId ? "Edit manager" : "Add the manager"}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <input
                className="admin-input"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <input
                className="admin-input disabled:bg-slate-100 disabled:text-slate-400"
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                /* The email is the login — changing it would orphan the
                   account, so it is fixed once created. */
                disabled={!!editingId}
                required
              />
              <input
                className="admin-input"
                placeholder="Phone (optional)"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <input
                className="admin-input"
                placeholder="Address (optional)"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            {!editingId && (
              <div className="mb-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                  Temporary Password
                </p>
                <div className="flex flex-wrap gap-2">
                  <div className="relative flex-1 min-w-[220px]">
                    <input
                      className="admin-input !pr-10"
                      type={showPass ? "text" : "password"}
                      placeholder="At least 6 characters"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      aria-label={showPass ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setForm({ ...form, password: suggestPassword() }); setShowPass(true); }}
                    className="admin-btn admin-btn-ghost !text-xs"
                  >
                    <KeyRound size={13} /> <span className="ml-1.5">Suggest</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Emailed to the employee, and shown here once after you save. They must choose their own
                  password before the staff panel opens.
                </p>
              </div>
            )}

            {/* Job title */}
            <div className="mb-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Designation</p>
              <div className="max-w-sm p-3.5 rounded-xl border-2 border-brand-400 bg-brand-50">
                <p className="font-bold text-sm m-0 text-brand-800">Manager</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                  Runs the shop day to day, under the admin
                </p>
              </div>
              <p className="text-[11px] text-slate-400 mt-2.5 flex items-start gap-1.5">
                <Shield size={12} className="mt-0.5 shrink-0" />
                There is only one manager account. What they can actually open is decided by the
                sections ticked below.
              </p>
            </div>

            {/* Module access */}
            <div className="mb-6">
              <AccessPicker
                selected={form.permissions}
                onChange={(permissions) => setForm({ ...form, permissions })}
              />
              {form.permissions.length === 0 && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
                  With no sections ticked they can sign in but will see nothing. You can add sections later.
                </p>
              )}
            </div>

            <div className="flex gap-2.5">
              <button type="submit" disabled={saving} className="admin-btn admin-btn-primary disabled:opacity-60">
                {saving ? "Saving…" : editingId ? "Save changes" : "Create employee"}
              </button>
              <button type="button" onClick={closeForm} className="admin-btn admin-btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
            <div className="absolute inset-0 rounded-full border-4 border-t-brand-600 animate-spin" />
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-card p-16 text-center">
          <span className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center mx-auto mb-4">
            <UserCog size={26} />
          </span>
          <p className="text-slate-500 font-medium m-0">
            {employees.length === 0 ? "No manager yet." : "No employees match that search."}
          </p>
          {employees.length === 0 && (
            <p className="text-slate-400 text-sm mt-1.5">
              Add the manager to give them their own sign-in and panel.
            </p>
          )}
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Employee", "Contact", "Designation", "Panel Access", "Status", "Actions"].map((h) => (
                    <th key={h} className="th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((employee) => {
                  const granted = Array.isArray(employee.permissions) ? employee.permissions : [];
                  const labels = GRANTABLE_MODULES.filter((m) => granted.includes(m.key));
                  return (
                    <tr
                      key={employee._id}
                      className={`transition-colors ${
                        employee.isBlocked ? "bg-amber-50/40" : "hover:bg-slate-50/80"
                      }`}
                    >
                      <td className="td">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={employee.name} />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 leading-tight m-0">{employee.name}</p>
                            {employee.mustChangePassword && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700
                                               bg-amber-100 px-1.5 py-0.5 rounded mt-1">
                                <KeyRound size={9} /> Temporary password
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="td">
                        <p className="text-slate-600 flex items-center gap-1.5 m-0">
                          <Mail size={12} className="text-slate-300 shrink-0" />
                          <span className="truncate max-w-[190px]">{employee.email}</span>
                        </p>
                        {employee.phone && (
                          <p className="text-slate-400 text-xs flex items-center gap-1.5 mt-1 m-0">
                            <Phone size={11} className="text-slate-300 shrink-0" /> {employee.phone}
                          </p>
                        )}
                        {employee.address && (
                          <p className="text-slate-400 text-xs flex items-center gap-1.5 mt-1 m-0">
                            <MapPin size={11} className="text-slate-300 shrink-0" />
                            <span className="truncate max-w-[190px]">{employee.address}</span>
                          </p>
                        )}
                      </td>

                      <td className="td">
                        <span className="status-badge bg-brand-100 text-brand-700">
                          {EMPLOYEE_ROLE_LABELS[employee.employeeRole] || "Manager"}
                        </span>
                      </td>

                      <td className="td">
                        {labels.length === 0 ? (
                          <span className="text-xs text-amber-700 font-semibold">No sections</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[260px]">
                            {labels.slice(0, 4).map(({ key, label }) => (
                              <span
                                key={key}
                                className="text-[10px] font-semibold text-slate-600 bg-slate-100
                                           px-1.5 py-0.5 rounded"
                              >
                                {label}
                              </span>
                            ))}
                            {labels.length > 4 && (
                              <span
                                title={labels.slice(4).map((m) => m.label).join(", ")}
                                className="text-[10px] font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded"
                              >
                                +{labels.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="td">
                        <span
                          className={`status-badge ${
                            employee.isBlocked
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${
                              employee.isBlocked ? "bg-amber-400" : "bg-emerald-400"
                            }`}
                          />
                          {employee.isBlocked ? "Blocked" : "Active"}
                        </span>
                      </td>

                      <td className="td">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => openEdit(employee)}
                            title="Edit details and access"
                            className="admin-btn bg-slate-100 hover:bg-slate-200 text-slate-700 !py-1.5 !px-2.5 !text-xs"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => handleResetPassword(employee)}
                            title="Issue a new temporary password"
                            className="admin-btn bg-slate-100 hover:bg-slate-200 text-slate-700 !py-1.5 !px-2.5 !text-xs"
                          >
                            <KeyRound size={12} />
                          </button>
                          <button
                            onClick={() => handleToggleBlock(employee)}
                            className={`admin-btn !py-1.5 !px-2.5 !text-xs ${
                              employee.isBlocked
                                ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                                : "bg-amber-50 hover:bg-amber-100 text-amber-700"
                            }`}
                          >
                            {employee.isBlocked ? <UserCheck size={12} /> : <Ban size={12} />}
                            <span className="ml-1.5">{employee.isBlocked ? "Unblock" : "Block"}</span>
                          </button>
                          <button
                            onClick={() => handleDelete(employee)}
                            title="Delete permanently"
                            className="admin-btn bg-brand-50 hover:bg-brand-100 text-brand-600 !py-1.5 !px-2.5 !text-xs"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-400">
            Showing {filtered.length} of {employees.length} employee{employees.length === 1 ? "" : "s"}
          </div>
        </div>
      )}
    </div>
  );
}
