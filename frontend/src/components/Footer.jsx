import { Link } from "react-router-dom";
import logoImg from "../assets/logo.png";

// Fonts are loaded once, non-blocking, from index.html.

const CATEGORIES = ["Cup", "T-Shirt", "Diary", "Pen", "ID Card", "Frame", "Keychain", "Banner"];
const QUICK_LINKS = [["Home", "/"], ["Products", "/products"], ["My Orders", "/orders"], ["Cart", "/cart"], ["Contact Us", "/contact"], ["Login", "/login"]];
const INFO = [
  { label: "About Us", to: "/about" },
  { label: "Privacy Policy", to: "/contact" },
  { label: "Terms & Conditions", to: "/terms" },
  { label: "Shipping Policy", to: "/shipping-policy" },
  { label: "Return Policy", to: "/return-policy" },
];

const IconMapPin = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#05618e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconPhone = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#05618e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);
const IconMail = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#05618e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
);
const IconPrinter = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);
const IconArrow = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const IconInstagram = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07c-1.28.06-2.15.26-2.91.56-.79.3-1.46.72-2.13 1.38C1.35 2.68.94 3.35.63 4.14c-.3.76-.5 1.63-.56 2.91C.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.28.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13.67.67 1.34 1.08 2.13 1.38.76.3 1.63.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.28-.06 2.15-.26 2.91-.56.79-.3 1.46-.71 2.13-1.38.67-.67 1.08-1.34 1.38-2.13.3-.76.5-1.63.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.28-.26-2.15-.56-2.91-.3-.79-.71-1.46-1.38-2.13C21.32 1.35 20.65.94 19.86.63c-.76-.3-1.63-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7.85-10.41a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z"/>
  </svg>
);
const IconFacebook = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M24 12.07C24 5.44 18.63.07 12 .07S0 5.44 0 12.07c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08v-3.47h3.05V9.43c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.24 2.69.24v2.95h-1.51c-1.49 0-1.96.93-1.96 1.87v2.25h3.33l-.53 3.47h-2.8v8.38C19.61 23.02 24 18.06 24 12.07z"/>
  </svg>
);
const IconWhatsapp = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.79h-.01c-1.77 0-3.5-.48-5.03-1.38l-.36-.22-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.89 9.89-9.89 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.89-9.88 9.89m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45h.005c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 0 0-3.48-8.42z"/>
  </svg>
);

/* Social profiles. Swap the Instagram / Facebook URLs for the real handles —
   the WhatsApp link already points at the shop number. */
const SOCIALS = [
  { label: "Instagram", href: "https://www.instagram.com/cloudgraphics.amravati", Icon: IconInstagram },
  { label: "Facebook",  href: "https://www.facebook.com/cloudgraphics.amravati",  Icon: IconFacebook },
  { label: "WhatsApp",  href: "https://wa.me/919307641746",                       Icon: IconWhatsapp },
];

export default function Footer() {
  return (
    <footer style={{ background: "#f3f7fa", borderTop: "1px solid #dee9f0" }} className="mt-auto">

      {/* ── CTA Strip ── */}
      <div style={{ background: "linear-gradient(120deg, #05618e, #0a3f59)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3.5">
            <div className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 46, height: 46, background: "rgba(255,255,255,0.16)" }}>
              <IconPrinter />
            </div>
            <div>
              <p className="m-0" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: 15, color: "#fff" }}>
                Got a design in mind?
              </p>
              <p className="m-0 mt-0.5" style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 12.5, color: "rgba(255,255,255,0.8)" }}>
                Custom printing on cups, tees, banners &amp; more — start today.
              </p>
            </div>
          </div>
          <Link
            to="/products"
            className="no-underline flex-shrink-0"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#fff",
              color: "#05618e",
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 700,
              fontSize: 13,
              padding: "9px 20px",
              borderRadius: 24,
              whiteSpace: "nowrap",
            }}
          >
            Start Customizing <IconArrow />
          </Link>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-x-5 gap-y-7 sm:gap-8 lg:gap-10">

          {/* ── 1. Brand Column ── */}
          <div className="col-span-2 lg:col-span-1 flex flex-col gap-5">
            <Link to="/" className="flex flex-col items-start gap-2 w-fit no-underline">
              <img src={logoImg} alt="Cloud Graphics — Visual Solution For Your Business" style={{ height: 74, width: "auto" }} />
              <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "8px", letterSpacing: "0.5em", color: "#475569" }}>AMRAVATI</span>
            </Link>

            <p className="text-sm text-black leading-relaxed m-0">
              Premium custom gift printing in Amravati. Personalize cups, t-shirts, diaries & more with your photos and designs.
            </p>

            {/* Contact info */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-start gap-2.5 text-sm text-black">
                <IconMapPin />
                <span className="leading-relaxed">Shivaji Chowk, Akoli Rd, Amravati, Maharashtra 444607</span>
              </div>
              <div className="flex items-start gap-2.5 text-sm text-black">
                <IconPhone />
                <span>093076 41746</span>
              </div>
              <div className="flex items-start gap-2.5 text-sm text-black">
                <IconMail />
                <span>info@cloudgraphics.in</span>
              </div>
            </div>

            {/* Social icons */}
            <div className="flex items-center gap-2 mt-1">
              {SOCIALS.map(({ href, label, Icon }) => (
                <a key={label} href={href} aria-label={label} title={label}
                  target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg border flex items-center justify-center transition-all no-underline"
                  style={{ borderColor: '#05618e', color: '#05618e', background: '#eff8fd' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='#05618e'; e.currentTarget.style.color='#fff';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='#eff8fd'; e.currentTarget.style.color='#05618e';}}>
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* ── 2. Quick Links ── */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold tracking-widest uppercase pb-2.5 border-b border-gray-100 m-0" style={{ color: "#0a3f59" }}>
              Quick Links
            </h4>
            {QUICK_LINKS.map(([label, to]) => (
              <Link key={to} to={to}
                className="flex items-center gap-2 text-sm text-black transition-colors no-underline group"
                onMouseEnter={e=>e.currentTarget.style.color='#05618e'}
                onMouseLeave={e=>e.currentTarget.style.color=''}>
                <span className="text-gray-300 group-hover:text-brand-400 transition-colors"><IconArrow /></span>
                {label}
              </Link>
            ))}
          </div>

          {/* ── 3. Categories ── */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold tracking-widest uppercase pb-2.5 border-b border-gray-100 m-0" style={{ color: "#0a3f59" }}>
              Categories
            </h4>
            {CATEGORIES.map((cat) => (
              <Link key={cat} to={`/products?category=${cat}`}
                className="flex items-center gap-2 text-sm text-black transition-colors no-underline group"
                onMouseEnter={e=>e.currentTarget.style.color='#05618e'}
                onMouseLeave={e=>e.currentTarget.style.color=''}>
                <span className="text-gray-300 group-hover:text-brand-400 transition-colors"><IconArrow /></span>
                {cat}
              </Link>
            ))}
          </div>

          {/* ── 4. Information ── */}
          <div className="col-span-2 sm:col-span-1 flex flex-col gap-3">
            <h4 className="text-xs font-bold tracking-widest uppercase pb-2.5 border-b border-gray-100 m-0" style={{ color: "#0a3f59" }}>
              Information
            </h4>
            <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:flex sm:flex-col sm:gap-3">
            {INFO.map(({ label, to }) => (
              <Link key={to} to={to}
                className="flex items-center gap-2 text-sm text-black no-underline group transition-colors"
                onMouseEnter={e => e.currentTarget.style.color = '#05618e'}
                onMouseLeave={e => e.currentTarget.style.color = ''}>
                <span className="text-gray-300"><IconArrow /></span>
                {label}
              </Link>
            ))}
            </div>
          </div>

          {/* ── 5. Find Us ── */}
          <div className="col-span-2 lg:col-span-1 flex flex-col gap-4">
            {/* Google Map */}
            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm w-full" style={{ height: 180 }}>
              <iframe
                title="Cloud Graphics Amravati"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3727.4449190429455!2d77.74044537471084!3d20.8944121923805!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bd6bb252ee3027d%3A0x8bcfbf0424a4bfb5!2sCloud%20Ghaphics!5e0!3m2!1sen!2sin!4v1778563342904!5m2!1sen!2sin"
                width="100%"
                height="180"
                style={{ border: 0, display: "block" }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div style={{ borderTop: "3px solid #05618e", background: "#0b2836" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-4 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2">
          <p className="text-xs text-center sm:text-left m-0" style={{ color: "#94aebd" }}>
            © {new Date().getFullYear()} <span className="font-semibold" style={{ color: "#fff" }}>Cloud Graphics Amravati</span>. All rights reserved.
          </p>
          <p className="text-xs text-center sm:text-right m-0" style={{ color: "#94aebd" }}>
            Developed &amp; Manage By{" "}
            <a
              href="https://tejasmehar.in"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold no-underline transition-colors"
              style={{ color: "#fff" }}
              onMouseEnter={e => e.currentTarget.style.color = '#05618e'}
              onMouseLeave={e => e.currentTarget.style.color = '#fff'}
            >
              Tejas Mehar
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
