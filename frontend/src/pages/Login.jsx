import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser, clearError } from "../features/auth/authSlice";
import { homePathFor } from "../utils/panel";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import logoImg from "../assets/logo.png";

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, error } = useSelector((s) => s.auth);
  const [form, setForm]       = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [params] = useSearchParams();
  const wasBlocked = params.get("blocked") === "1";

  /* Admins land on their panel, employees on the first section they hold (or
     the password screen while their temporary one stands), shoppers on the
     storefront. One helper decides it so every entry point agrees. */
  useEffect(() => {
    if (user) navigate(homePathFor(user), { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (error) { toast.error(error); dispatch(clearError()); }
  }, [error, dispatch]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-5 py-10 sm:px-8">
      <div className="w-full max-w-[400px] bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">

        {/* Logo — the full stacked lockup, wordmark and all */}
        <Link to="/" className="flex justify-center mb-7">
          <img src={logoImg} alt="Cloud Graphics — Visual Solution For Your Business" className="h-[84px] w-auto block" />
        </Link>

        {/* Heading */}
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-black text-gray-900 leading-tight">Welcome back 👋</h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to your Cloud Graphics account</p>
        </div>

        {wasBlocked && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-amber-900 font-bold text-sm m-0">Your account has been blocked</p>
            <p className="text-amber-700 text-xs mt-1 leading-relaxed">
              You have been signed out. Contact the administrator to have access restored.
            </p>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); dispatch(loginUser(form)); }} noValidate className="space-y-4">

          {/* Email */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <input
                type="email" name="email" placeholder="you@example.com" required
                value={form.email} onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 outline-none focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                Password
              </label>
              <Link to="/forgot-password" className="text-[11px] text-brand-700 font-semibold hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <input
                type={showPass ? "text" : "password"} name="password"
                placeholder="Enter your password" required
                value={form.password} onChange={handleChange}
                className="w-full pl-10 pr-11 py-3 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 outline-none focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all"
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors">
                {showPass
                  ? <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                }
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl bg-brand-800 hover:bg-brand-900 active:scale-[0.98] text-white text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-brand-200 mt-2"
          >
            {loading
              ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Signing in...</>
              : "Sign In →"
            }
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-gray-400 text-xs font-medium">or</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* Guest CTA */}
        <Link to="/products"
          className="w-full py-3 rounded-xl border border-gray-200 text-sm text-gray-600 font-semibold hover:border-brand-200 hover:text-brand-700 hover:bg-brand-50 transition-all flex items-center justify-center gap-2">
          🛍️ Browse as Guest
        </Link>

        <p className="text-center text-gray-500 text-sm mt-5">
          New here?{" "}
          <Link to="/register" className="text-brand-800 font-bold hover:underline">Create free account</Link>
        </p>
      </div>
    </div>
  );
}
