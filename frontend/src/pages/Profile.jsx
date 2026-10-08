import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { updateProfile } from "../features/auth/authSlice";
import { toast } from "react-toastify";
import {
  User, Mail, Phone, Lock, Save, KeyRound, ShieldCheck, Package,
  Heart, RefreshCcw, ChevronRight, BadgeCheck, X, Eye, EyeOff,
} from "lucide-react";
import { selectFavoriteCount } from "../features/favorites/favoritesSlice";

/* Quick jumps out of the profile — the things people actually came looking for */
const SHORTCUTS = [
  { to: "/orders", icon: Package, label: "My Orders", hint: "Track, cancel & reorder" },
  { to: "/favorites", icon: Heart, label: "My Wishlist", hint: "Saved for later" },
  { to: "/replacements", icon: RefreshCcw, label: "Replacements", hint: "Raise or track a request" },
];

export default function Profile() {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((s) => s.auth);
  const favCount = useSelector(selectFavoriteCount);

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwSection, setShowPwSection] = useState(false);
  const [revealPw, setRevealPw] = useState(false);

  useEffect(() => { setName(user?.name || ""); setPhone(user?.phone || ""); }, [user]);

  /* Nothing to save until something actually differs from what's on file */
  const dirty =
    name.trim() !== (user?.name || "") ||
    phone.trim() !== (user?.phone || "") ||
    (showPwSection && (currentPassword || newPassword || confirmPassword));

  const resetPw = () => {
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    setShowPwSection(false); setRevealPw(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name cannot be empty"); return; }
    if (phone && !/^\d{10}$/.test(phone.trim())) { toast.error("Enter a valid 10-digit phone number"); return; }
    const payload = { name: name.trim(), phone: phone.trim() };
    if (showPwSection) {
      if (!currentPassword) { toast.error("Enter your current password"); return; }
      if (newPassword.length < 6) { toast.error("New password must be at least 6 characters"); return; }
      if (newPassword !== confirmPassword) { toast.error("New passwords do not match"); return; }
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }
    const result = await dispatch(updateProfile(payload));
    if (!result.error) { toast.success("Profile updated successfully!"); resetPw(); }
    else { toast.error(result.payload || "Update failed"); }
  };

  const inputCls =
    "w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-[13.5px] bg-white text-slate-800 " +
    "placeholder-slate-400 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10 " +
    "transition-all box-border font-[inherit]";
  const iconCls = "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none";
  const labelCls = "block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2";

  /* Password strength — advisory only, never blocks the save */
  const pwScore = [
    newPassword.length >= 6,
    newPassword.length >= 10,
    /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword),
    /\d/.test(newPassword),
    /[^A-Za-z0-9]/.test(newPassword),
  ].filter(Boolean).length;
  const pwMeta = [
    { label: "Too short", color: "#dc4f49" },
    { label: "Weak", color: "#dc4f49" },
    { label: "Fair", color: "#d9971b" },
    { label: "Good", color: "#0274ad" },
    { label: "Strong", color: "#0f9d70" },
    { label: "Excellent", color: "#0f9d70" },
  ][pwScore];

  return (
    <div className="bg-[#f7fafc] min-h-[80vh]">

      {/* ── Page header ── */}
      <header className="bg-white border-b border-slate-200/70">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 md:py-5 flex items-center justify-between gap-4">
          <h1 className="font-display text-[21px] md:text-[25px] font-black text-slate-900 tracking-[-0.02em] leading-none m-0">
            My Account
          </h1>
          <Link
            to="/orders"
            className="hidden sm:inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 no-underline transition-colors hover:text-brand-700"
          >
            <Package className="w-3.5 h-3.5" />
            View Orders
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-9 pb-20">

        {/* ── Identity card ── */}
        <section className="relative rounded-3xl overflow-hidden mb-6 border border-slate-200/70 shadow-sm">
          <div className="relative px-6 md:px-9 py-8 md:py-9" style={{ background: "#072535" }}>
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 12% 20%, rgba(5, 97, 142,0.55), transparent 58%), radial-gradient(circle at 90% 90%, rgba(41,163,220,0.28), transparent 55%)",
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.14]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.16) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
                maskImage: "radial-gradient(circle at 30% 40%, #000 5%, transparent 70%)",
                WebkitMaskImage: "radial-gradient(circle at 30% 40%, #000 5%, transparent 70%)",
              }}
            />

            <div className="relative flex flex-col sm:flex-row items-center sm:items-end text-center sm:text-left gap-5" style={{ zIndex: 2 }}>
              <div className="relative shrink-0">
                <div
                  className="w-[74px] h-[74px] rounded-2xl flex items-center justify-center text-white font-black text-[30px] leading-none ring-4 ring-white/15"
                  style={{ background: "linear-gradient(140deg, #0274ad, #094d6f)", boxShadow: "0 10px 28px rgba(2,136,203,0.42)" }}
                >
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </div>
                {user?.isAdmin && (
                  <span
                    className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "#0f9d70", boxShadow: "0 0 0 4px #072535" }}
                    title="Administrator"
                  >
                    <BadgeCheck className="w-4 h-4 text-white" />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-white text-[22px] md:text-[26px] font-black tracking-tight leading-tight m-0 truncate">
                  {user?.name || "My Profile"}
                </h2>
                <p className="text-white/60 text-[13px] mt-1 font-medium truncate">{user?.email}</p>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-white"
                    style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {user?.isAdmin ? "Administrator" : "Verified Account"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-white"
                    style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
                    <Heart className="w-3.5 h-3.5" />
                    {favCount} saved
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Shortcuts ── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {SHORTCUTS.map(({ to, icon: Icon, label, hint }) => (
            <Link
              key={to}
              to={to}
              className="group flex items-center gap-3.5 bg-white rounded-2xl border border-slate-200/70 shadow-sm px-4 py-3.5 no-underline transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-brand-200"
            >
              <span className="shrink-0 w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center transition-colors group-hover:bg-brand-600 group-hover:text-white">
                <Icon className="w-[18px] h-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-bold text-slate-900 leading-tight">{label}</span>
                <span className="block text-[11.5px] text-slate-400 font-medium mt-0.5 truncate">{hint}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />
            </Link>
          ))}
        </section>

        <form onSubmit={handleSave} className="flex flex-col gap-5">

          {/* ── Personal information ── */}
          <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
            <div className="px-5 md:px-7 py-4 border-b border-slate-100 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-[14px] font-black text-slate-900 m-0 leading-tight">Personal Information</h3>
                <p className="text-[11.5px] text-slate-400 font-medium m-0 mt-0.5">How we address you and where we call you</p>
              </div>
            </div>

            <div className="px-5 md:px-7 py-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className={labelCls}>Full Name *</label>
                <div className="relative group">
                  <User className={`${iconCls} group-focus-within:text-brand-600 transition-colors`} />
                  <input className={inputCls} placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Email Address</label>
                <div className="relative">
                  <Mail className={iconCls} />
                  <input className={`${inputCls} bg-slate-50 text-slate-400 cursor-not-allowed`} value={user?.email || ""} readOnly />
                </div>
                <p className="text-slate-400 text-[11px] mt-2 font-medium flex items-center gap-1.5">
                  <Lock className="w-3 h-3" /> Locked — contact support to change this.
                </p>
              </div>

              <div>
                <label className={labelCls}>Phone Number</label>
                <div className="relative group">
                  <Phone className={`${iconCls} group-focus-within:text-brand-600 transition-colors`} />
                  <input
                    className={inputCls}
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    maxLength={10}
                    inputMode="numeric"
                  />
                </div>
                <p className="text-slate-400 text-[11px] mt-2 font-medium">Used for delivery updates only.</p>
              </div>
            </div>
          </section>

          {/* ── Password ── */}
          <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
            <div className="px-5 md:px-7 py-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-[14px] font-black text-slate-900 m-0 leading-tight">Password & Security</h3>
                  <p className="text-[11.5px] text-slate-400 font-medium m-0 mt-0.5">
                    {showPwSection ? "Enter your current password to confirm" : "Last set when you registered"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => (showPwSection ? resetPw() : setShowPwSection(true))}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[12px] font-bold cursor-pointer transition-all active:scale-95 border ${
                  showPwSection
                    ? "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    : "border-brand-600 bg-brand-600 text-white hover:bg-brand-700 shadow-sm"
                }`}
              >
                {showPwSection ? <><X className="w-3.5 h-3.5" /> Cancel</> : <><Lock className="w-3.5 h-3.5" /> Change Password</>}
              </button>
            </div>

            {showPwSection && (
              <div className="px-5 md:px-7 py-6 flex flex-col gap-5 animate-fade-in-up">
                <div>
                  <label className={labelCls}>Current Password *</label>
                  <div className="relative group">
                    <Lock className={`${iconCls} group-focus-within:text-brand-600 transition-colors`} />
                    <input
                      type={revealPw ? "text" : "password"}
                      className={`${inputCls} pr-12`}
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setRevealPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center bg-transparent border-none text-slate-400 hover:text-brand-600 cursor-pointer transition-colors"
                      aria-label={revealPw ? "Hide passwords" : "Show passwords"}
                    >
                      {revealPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>New Password *</label>
                    <div className="relative group">
                      <Lock className={`${iconCls} group-focus-within:text-brand-600 transition-colors`} />
                      <input
                        type={revealPw ? "text" : "password"}
                        className={inputCls}
                        placeholder="Min 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                    </div>
                    {newPassword && (
                      <div className="mt-2.5">
                        <div className="flex gap-1">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <span
                              key={i}
                              className="h-1 flex-1 rounded-full transition-colors duration-300"
                              style={{ background: i < pwScore ? pwMeta.color : "#e2e8f0" }}
                            />
                          ))}
                        </div>
                        <p className="text-[11px] font-bold mt-1.5 m-0" style={{ color: pwMeta.color }}>
                          {pwMeta.label}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>Confirm New Password *</label>
                    <div className="relative group">
                      <Lock className={`${iconCls} group-focus-within:text-brand-600 transition-colors`} />
                      <input
                        type={revealPw ? "text" : "password"}
                        className={`${inputCls} ${
                          confirmPassword && confirmPassword !== newPassword
                            ? "border-red-400 focus:border-red-400 focus:ring-red-400/10 bg-red-50/50"
                            : ""
                        }`}
                        placeholder="Repeat new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                    </div>
                    {confirmPassword && confirmPassword !== newPassword && (
                      <p className="text-red-500 text-[11px] mt-2 font-bold">Passwords do not match</p>
                    )}
                    {confirmPassword && confirmPassword === newPassword && (
                      <p className="text-emerald-600 text-[11px] mt-2 font-bold flex items-center gap-1">
                        <BadgeCheck className="w-3.5 h-3.5" /> Passwords match
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── Save bar ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-2xl border border-slate-200/70 shadow-sm px-5 md:px-7 py-4">
            <p className="text-[12px] text-slate-400 font-medium m-0">
              {dirty ? "You have unsaved changes." : "Everything is up to date."}
            </p>
            <button
              type="submit"
              disabled={loading || !dirty}
              className={`inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl font-bold text-[13.5px] text-white border-none transition-all ${
                loading || !dirty
                  ? "bg-slate-300 cursor-not-allowed"
                  : "bg-brand-600 hover:bg-brand-700 cursor-pointer shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              }`}
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
