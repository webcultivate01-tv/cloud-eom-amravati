import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Lock, LogOut, Mail } from "lucide-react";
import { logout } from "../../features/auth/authSlice";
import { EMPLOYEE_ROLE_LABELS } from "../../utils/panel";
import logoImg from "../../assets/logo.png";

/**
 * Where an employee lands when their account exists but carries no sections —
 * either freshly created before the admin picked any, or after every grant was
 * taken away. Deliberately a dead end: there is nothing for them to open.
 */
export default function NoAccess() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);

  const handleLogout = () => {
    dispatch(logout());
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-5 py-10">
      <div className="w-full max-w-[460px] bg-white rounded-2xl border border-slate-100 shadow-sm p-7 sm:p-9 text-center">
        <img
          src={logoImg}
          alt="Cloud Graphics — Visual Solution For Your Business"
          className="h-[64px] w-auto mx-auto mb-7"
        />

        <span className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600
                         flex items-center justify-center mx-auto mb-5">
          <Lock size={24} />
        </span>

        <h1 className="text-xl font-black text-slate-900 leading-tight">No sections assigned yet</h1>
        <p className="text-slate-500 text-sm mt-2.5 leading-relaxed">
          Your staff account is active, but an administrator has not given it access to any part of the
          panel. Once they do, the sections appear here the next time you sign in.
        </p>

        <div className="mt-6 text-left bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Signed in as</p>
          <p className="text-slate-800 font-semibold text-sm leading-tight">{user?.name}</p>
          <p className="text-slate-400 text-xs mt-0.5">{user?.email}</p>
          {user?.employeeRole && (
            <span className="inline-block mt-2.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700
                             text-[11px] font-bold tracking-wide">
              {EMPLOYEE_ROLE_LABELS[user.employeeRole] || "Staff"}
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 mt-6">
          <a
            href="/contact"
            className="flex-1 py-3 rounded-xl border border-slate-200 text-sm text-slate-600 font-semibold
                       hover:border-brand-200 hover:text-brand-700 hover:bg-brand-50 transition-all
                       flex items-center justify-center gap-2 no-underline"
          >
            <Mail size={15} /> Contact the shop
          </a>
          <button
            onClick={handleLogout}
            className="flex-1 py-3 rounded-xl bg-brand-800 hover:bg-brand-900 text-white text-sm font-bold
                       transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
