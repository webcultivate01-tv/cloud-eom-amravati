import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { KeyRound, Eye, EyeOff, Check } from "lucide-react";
import { updateProfile } from "../../features/auth/authSlice";
import { homePathFor } from "../../utils/panel";
import logoImg from "../../assets/logo.png";

const PasswordField = ({ label, value, onChange, placeholder, autoComplete, show, onToggle, hint, hintTone }) => (
  <div>
    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
      {label}
    </label>
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="w-full pl-4 pr-11 py-3 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-900
                   placeholder-gray-400 outline-none focus:border-brand-600 focus:bg-white
                   focus:ring-2 focus:ring-brand-100 transition-all"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? "Hide passwords" : "Show passwords"}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
    {hint && (
      <p className={`text-[11px] mt-1.5 font-medium ${hintTone === "bad" ? "text-red-600" : "text-gray-400"}`}>
        {hint}
      </p>
    )}
  </div>
);

/**
 * First sign-in for a new employee.
 *
 * The admin hands over a temporary password; nothing in the panel opens until
 * it has been replaced. The exchange runs through the normal profile update,
 * which clears `mustChangePassword` server-side once the new password sticks.
 */
export default function SetPassword() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading } = useSelector((s) => s.auth);

  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [show, setShow] = useState(false);

  // Already done (or an admin reset it back) — go where they belong.
  useEffect(() => {
    if (user && user.role === "employee" && !user.mustChangePassword) {
      navigate(homePathFor(user), { replace: true });
    }
  }, [user, navigate]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const tooShort = form.newPassword.length > 0 && form.newPassword.length < 6;
  const mismatch = form.confirmPassword.length > 0 && form.newPassword !== form.confirmPassword;
  const sameAsTemp =
    form.newPassword.length > 0 && form.newPassword === form.currentPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword.length < 6) return toast.error("New password must be at least 6 characters");
    if (form.newPassword !== form.confirmPassword) return toast.error("The two passwords do not match");
    if (sameAsTemp) return toast.error("Choose a password different from the temporary one");

    const result = await dispatch(
      updateProfile({ currentPassword: form.currentPassword, newPassword: form.newPassword })
    );
    if (result.error) return toast.error(result.payload);

    toast.success("Password set — welcome aboard");
    navigate(homePathFor({ ...user, ...result.payload }), { replace: true });
  };

  const toggleShow = () => setShow((v) => !v);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-5 py-10">
      <div className="w-full max-w-[440px] bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
        <Link to="/" className="flex justify-center mb-6">
          <img
            src={logoImg}
            alt="Cloud Graphics — Visual Solution For Your Business"
            className="h-[70px] w-auto block"
          />
        </Link>

        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-6">
          <span className="w-8 h-8 shrink-0 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
            <KeyRound size={16} />
          </span>
          <div>
            <p className="text-amber-900 font-bold text-sm leading-tight">Choose your own password</p>
            <p className="text-amber-700 text-xs mt-1 leading-relaxed">
              You signed in with the temporary password your administrator gave you. Set a password only
              you know — the staff panel opens as soon as you do.
            </p>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-black text-slate-900 leading-tight">
            Hi {user?.name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">{user?.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <PasswordField
            label="Temporary password"
            value={form.currentPassword}
            onChange={set("currentPassword")}
            placeholder="The one you were given"
            autoComplete="current-password"
            show={show}
            onToggle={toggleShow}
          />
          <PasswordField
            label="New password"
            value={form.newPassword}
            onChange={set("newPassword")}
            placeholder="At least 6 characters"
            autoComplete="new-password"
            show={show}
            onToggle={toggleShow}
            hint={
              tooShort ? "Too short — use at least 6 characters"
              : sameAsTemp ? "Pick something different from the temporary one"
              : "At least 6 characters"
            }
            hintTone={tooShort || sameAsTemp ? "bad" : "ok"}
          />
          <PasswordField
            label="Confirm new password"
            value={form.confirmPassword}
            onChange={set("confirmPassword")}
            placeholder="Type it again"
            autoComplete="new-password"
            show={show}
            onToggle={toggleShow}
            hint={mismatch ? "The two passwords do not match" : undefined}
            hintTone="bad"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-brand-800 hover:bg-brand-900 active:scale-[0.98]
                       text-white text-sm font-bold transition-all disabled:opacity-50
                       flex items-center justify-center gap-2 shadow-lg shadow-brand-200 mt-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving…
              </>
            ) : (
              <>
                <Check size={16} /> Set password &amp; continue
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
