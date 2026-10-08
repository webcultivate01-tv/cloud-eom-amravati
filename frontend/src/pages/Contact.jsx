import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { submitInquiry } from "../features/inquiry/inquirySlice";
import { toast } from "react-toastify";
import Reveal, { RevealGroup } from "../components/Reveal";

const EMPTY = { name: "", email: "", phone: "", subject: "", message: "" };
const SUBJECTS = [
  "Order / Delivery Issue",
  "Custom Printing Query",
  "Bulk Order Enquiry",
  "Product Information",
  "Payment / Refund",
  "Other",
];

// SVG Icons
const IconLocation = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const IconPhone = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1 19.79 19.79 0 0 1 1.58 4.5 2 2 0 0 1 3.55 2.33h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.94-1.94a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const IconMail = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const IconClock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const IconSend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const IconCheck = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const IconChevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const CONTACT_INFO = [
  { Icon: IconLocation, label: "Address", value: "Shivaji Chowk, Akoli Rd, Amravati, Maharashtra 444607" },
  { Icon: IconPhone, label: "Phone", value: "+91 93076 41746" },
  { Icon: IconMail, label: "Email", value: "info@cloudgraphics.in" },
  { Icon: IconClock, label: "Business Hours", value: "Mon – Sat: 10 AM – 7 PM" },
];

export default function Contact() {
  const dispatch = useDispatch();
  const { loading } = useSelector((s) => s.inquiry);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  // After a successful submit, send the user back to the home page
  useEffect(() => {
    if (!submitted) return;
    const t = setTimeout(() => navigate("/"), 3000);
    return () => clearTimeout(t);
  }, [submitted, navigate]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    else if (!/^\+?[\d\s\-()]{7,15}$/.test(form.phone)) e.phone = "Enter a valid phone number";
    if (!form.subject) e.subject = "Please select a subject";
    if (form.message.trim() && form.message.trim().length < 10) e.message = "Message must be at least 10 characters";
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const result = await dispatch(submitInquiry(form));
    if (!result.error) {
      toast.success("Inquiry submitted! Check your email for confirmation.");
      setForm(EMPTY); setErrors({}); setSubmitted(true);
    } else {
      toast.error(result.payload || "Failed to submit. Please try again.");
    }
  };

  const inputCls = (err) =>
    `w-full border rounded-lg px-4 py-3 text-sm outline-none font-[inherit] transition-all duration-200 box-border appearance-none ${
      err
        ? "border-[#05618e] bg-[#eff8fd] focus:border-[#05618e] focus:ring-2 focus:ring-[#daeffa]"
        : "border-gray-200 bg-white focus:border-[#05618e] focus:ring-2 focus:ring-[#daeffa] hover:border-gray-300"
    }`;

  /* ── Success Screen ── */
  if (submitted) return (
    <div style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }} className="min-h-[80vh] flex items-center justify-center px-4">
      <Reveal variant="zoom" className="bg-white rounded-3xl border border-gray-100 shadow-xl p-12 max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 text-green-600 mb-6 mx-auto">
          <IconCheck />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Inquiry Sent!</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          Thank you for reaching out. We've received your message and sent a confirmation to your email.
          Our team will get back to you within <strong className="text-gray-700">24–48 hours</strong>.
        </p>
        <p className="text-gray-400 text-xs mb-4">Redirecting you to the home page…</p>
        <button
          onClick={() => navigate("/")}
          className="bg-[#05618e] hover:bg-[#094d6f] text-white px-8 py-3.5 rounded-xl font-bold text-sm border-none cursor-pointer transition-colors duration-200 inline-flex items-center gap-2"
        >
          Go to Home Now
        </button>
      </Reveal>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Main Content ── */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-[380px_1fr] gap-10 items-start">

          {/* ── Info Panel ── */}
          <RevealGroup variant="left" stagger={140} className="space-y-5 order-2 md:order-1 mt-0">
            {/* Contact card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden order-1 md:order-2">
              {/* Card header */}
              <div className="px-7 py-5 border-b border-gray-50" style={{ background: "#eff8fd" }}>
                <h2 className="text-base font-black text-gray-900 tracking-tight">Get in Touch</h2>
                <p className="text-gray-500 text-xs leading-relaxed mt-1">
                  Questions about products, printing, or orders? We've got you covered.
                </p>
              </div>

              {/* Contact details */}
              <div className="px-7 py-5 space-y-5">
                {CONTACT_INFO.map(({ Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-4">
                    <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-[#05618e] mt-0.5" style={{ background: "#daeffa" }}>
                      <Icon />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
                      <p className="text-gray-700 text-sm font-semibold leading-snug">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Response badge */}
              <div className="px-7 py-4 border-t border-gray-50" style={{ background: "#f8fafc" }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" style={{ boxShadow: "0 0 6px #22c55e" }} />
                  <p className="text-gray-500 text-xs leading-relaxed">
                    We typically respond within <strong className="text-gray-700">24–48 hours</strong> on business days.
                  </p>
                </div>
              </div>
            </div>

            {/* Map */}
            <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white">
              <iframe
                title="Cloud Graphics Amravati"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3727.4449190429455!2d77.74044537471084!3d20.8944121923805!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bd6bb252ee3027d%3A0x8bcfbf0424a4bfb5!2sCloud%20Ghaphics!5e0!3m2!1sen!2sin!4v1778563342904!5m2!1sen!2sin"
                width="100%" height="176"
                style={{ border: 0, display: "block" }}
                allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </RevealGroup>

          {/* ── Contact Form ── */}
          <Reveal variant="right" delay={120} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden order-1 md:order-2">
            <div className="px-7 md:px-9 py-6 border-b border-gray-50" style={{ background: "#eff8fd" }}>
              <h2 className="text-base font-black text-gray-900 tracking-tight">Send Us a Message</h2>
              <p className="text-gray-500 text-xs mt-1">Fill in your details and we'll get back to you as soon as possible.</p>
            </div>

            <div className="px-7 md:px-9 py-8">
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

                {/* Row 1 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-600 tracking-wide">Full Name <span className="text-[#05618e]">*</span></label>
                    <input
                      type="text" name="name" placeholder="Your full name"
                      value={form.name} onChange={handleChange}
                      className={inputCls(errors.name)}
                    />
                    {errors.name && <span className="text-[#05618e] text-xs font-semibold flex items-center gap-1">{errors.name}</span>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-600 tracking-wide">Email Address <span className="text-[#05618e]">*</span></label>
                    <input
                      type="email" name="email" placeholder="you@example.com"
                      value={form.email} onChange={handleChange}
                      className={inputCls(errors.email)}
                    />
                    {errors.email && <span className="text-[#05618e] text-xs font-semibold">{errors.email}</span>}
                  </div>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-600 tracking-wide">Phone Number <span className="text-[#05618e]">*</span></label>
                    <input
                      type="tel" name="phone" placeholder="+91 98765 43210"
                      value={form.phone} onChange={handleChange}
                      className={inputCls(errors.phone)}
                    />
                    {errors.phone && <span className="text-[#05618e] text-xs font-semibold">{errors.phone}</span>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-600 tracking-wide">Subject <span className="text-[#05618e]">*</span></label>
                    <div className="relative">
                      <select
                        name="subject" value={form.subject} onChange={handleChange}
                        className={`${inputCls(errors.subject)} pr-10`}
                        style={{ WebkitAppearance: "none" }}
                      >
                        <option value="">— Select a subject —</option>
                        {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <IconChevron />
                      </div>
                    </div>
                    {errors.subject && <span className="text-[#05618e] text-xs font-semibold">{errors.subject}</span>}
                  </div>
                </div>

                {/* Message */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-600 tracking-wide">Message <span className="text-gray-400 font-semibold">(optional)</span></label>
                  <textarea
                    name="message" rows={5}
                    placeholder="Optional — describe your inquiry in detail, include order numbers, quantities, or any relevant information..."
                    value={form.message} onChange={handleChange}
                    className={`${inputCls(errors.message)} resize-y min-h-28`}
                  />
                  {errors.message
                    ? <span className="text-[#05618e] text-xs font-semibold">{errors.message}</span>
                    : <span className="text-gray-300 text-xs text-right">{form.message.length} / 1000 characters</span>
                  }
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl font-bold text-sm text-white border-none cursor-pointer transition-all duration-200 ${
                    loading
                      ? "bg-[#5cb8e4] cursor-not-allowed"
                      : "bg-[#05618e] hover:bg-[#094d6f] hover:shadow-lg hover:-translate-y-0.5"
                  }`}
                  style={!loading ? { boxShadow: "0 4px 14px rgba(10, 91, 130,0.3)" } : {}}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      Sending…
                    </>
                  ) : (
                    <>
                      <IconSend />
                      Send Inquiry
                    </>
                  )}
                </button>

                <p className="text-center text-gray-400 text-xs">
                  By submitting, you agree to our{" "}
                  <a href="#" className="text-[#05618e] hover:underline font-medium">Privacy Policy</a>
                  {" "}and{" "}
                  <a href="#" className="text-[#05618e] hover:underline font-medium">Terms of Service</a>.
                </p>
              </form>
            </div>
          </Reveal>

        </div>
      </div>
    </div>
  );
}
