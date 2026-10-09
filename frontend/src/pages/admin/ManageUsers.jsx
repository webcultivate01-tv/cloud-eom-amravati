import { confirmDialog } from "../../components/ConfirmDialog";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllUsers, toggleBlockUser, deleteUser } from "../../features/users/userSlice";
import { toast } from "react-toastify";

/* Avatars are an initial on a tint of the panel's own brand colour —
   one colour for every user. A random palette per name made the table
   read like a chart, implying a difference between rows that doesn't
   exist, and dragged six unrelated hues into a single-accent panel. */
const Avatar = ({ name }) => (
  <div
    aria-hidden="true"
    className="w-9 h-9 shrink-0 rounded-xl bg-brand-50 border border-brand-100
               text-brand-700 flex items-center justify-center font-bold text-sm"
  >
    {name?.[0]?.toUpperCase() || "?"}
  </div>
);

export default function ManageUsers() {
  const dispatch = useDispatch();
  const { users, loading } = useSelector((state) => state.users);
  const [search, setSearch] = useState("");

  useEffect(() => { dispatch(fetchAllUsers()); }, [dispatch]);

  const handleToggleBlock = async (user) => {
    const action = user.isBlocked ? "Unblock" : "Block";
    if (!(await confirmDialog(`${action} ${user.name}?`))) return;
    const result = await dispatch(toggleBlockUser(user._id));
    if (!result.error) toast.success(`User ${action.toLowerCase()}ed successfully`);
    else toast.error(result.payload);
  };

  const handleDelete = async (user) => {
    if (!(await confirmDialog(`Permanently delete "${user.name}"? This cannot be undone.`))) return;
    const result = await dispatch(deleteUser(user._id));
    if (!result.error) toast.success("User deleted");
    else toast.error(result.payload);
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Users</h1>
          <p className="text-slate-400 text-sm mt-0.5">{users.length} registered users</p>
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="admin-input !pl-9 w-72"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
            <div className="absolute inset-0 rounded-full border-4 border-t-brand-600 animate-spin" />
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-card p-16 text-center">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-slate-500 font-medium">No users found.</p>
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["#", "User", "Email", "Phone", "Status", "Joined", "Actions"].map((h) => (
                    <th key={h} className="th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((user, i) => (
                  <tr key={user._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="td text-slate-400 text-xs font-medium">{i + 1}</td>
                    <td className="td">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={user.name} />
                        <span className="font-semibold text-slate-800">{user.name}</span>
                      </div>
                    </td>
                    <td className="td text-slate-500">{user.email}</td>
                    <td className="td text-slate-500">{user.phone || <span className="text-slate-300">—</span>}</td>
                    <td className="td">
                      <span className={`status-badge ${user.isBlocked ? "bg-brand-100 text-brand-600" : "bg-emerald-100 text-emerald-700"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${user.isBlocked ? "bg-brand-400" : "bg-emerald-400"}`} />
                        {user.isBlocked ? "Blocked" : "Active"}
                      </span>
                    </td>
                    <td className="td text-slate-400 text-xs">
                      {new Date(user.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </td>
                    <td className="td">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleBlock(user)}
                          className={`admin-btn !py-1.5 !px-3 !text-xs ${
                            user.isBlocked
                              ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                              : "bg-amber-50 hover:bg-amber-100 text-amber-700"
                          }`}
                        >
                          {user.isBlocked ? "Unblock" : "Block"}
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="admin-btn bg-brand-50 hover:bg-brand-100 text-brand-600 !py-1.5 !px-3 !text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-400">
            Showing {filtered.length} of {users.length} users
          </div>
        </div>
      )}
    </div>
  );
}
