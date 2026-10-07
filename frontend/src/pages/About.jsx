import { Link } from "react-router-dom";
import Reveal, { RevealGroup } from "../components/Reveal";

const BRAND = "#0672a7";

/* ── SVG Icons ── */
const IconPrint = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);
const IconPalette = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/>
    <circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.7 0 2-1.3 1.2-2.1-.8-.9-.8-2.2.3-2.9.6-.4 1.3-.4 2-.4h1.6c2.7 0 4.9-2.2 4.9-4.9C22 6.1 17.5 2 12 2z"/>
  </svg>
);
const IconTruck = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"/>
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);
const IconShield = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
);
const IconLocation = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
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
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconArrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

const STATS = [
  { value: "500+", label: "Happy Clients" },
  { value: "10+", label: "Product Categories" },
  { value: "24–48hr", label: "Response Time" },
  { value: "6 Days", label: "A Week Open" },
];

const VALUES = [
  { Icon: IconPrint, title: "Print Quality First", desc: "Every order goes through a proof check before it reaches the press. What you approve is what you get." },
  { Icon: IconPalette, title: "Your Design, Your Way", desc: "Upload artwork or send us an idea — our team helps shape it into something print-ready." },
  { Icon: IconTruck, title: "Quick Turnarounds", desc: "Most custom orders ship within a few working days, with free delivery above ₹299." },
  { Icon: IconShield, title: "Straightforward Support", desc: "Easy replacements, a clear return policy, and a real person on the other end of the phone." },
];

const OFFERINGS = [
  "Custom Printed Cups", "T-Shirts & Apparel", "Corporate Diaries", "Branded Pens",
  "ID Cards & Lanyards", "Photo Frames", "Keychains", "Banners & Standees",
];

const CONTACT_INFO = [
  { Icon: IconLocation, label: "Visit Us", value: "Shivaji Chowk, Akoli Rd, Amravati, Maharashtra 444607" },
  { Icon: IconPhone, label: "Call Us", value: "+91 93076 41746" },
  { Icon: IconMail, label: "Email Us", value: "info@cloudgraphics.in" },
  { Icon: IconClock, label: "Business Hours", value: "Mon – Sat: 10 AM – 7 PM" },
];

export default function About() {
  return (
    <div className="bg-gray-50 min-h-screen" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── HERO — light, kept short so the story starts above the fold ── */}
      <section
        className="relative overflow-hidden flex flex-col justify-center"
        style={{
          minHeight: "auto",
          background: "linear-gradient(180deg, #f4fafd 0%, #ffffff 100%)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 18% 10%, rgba(6,114,167,0.10), transparent 55%), radial-gradient(circle at 88% 85%, rgba(41,163,220,0.08), transparent 52%)",
          }}
        />
        {/* Faint artboard grid, faded off at the edges */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(6,114,167,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(6,114,167,0.10) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(circle at 50% 40%, #000 8%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 40%, #000 8%, transparent 70%)",
          }}
        />

        <div className="relative w-full max-w-5xl mx-auto px-6 pt-8 pb-9 md:pt-10 md:pb-11 text-center flex-1 flex flex-col justify-center" style={{ zIndex: 2 }}>
          <Reveal
            as="h1"
            className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 mb-5 tracking-tight leading-[1.05]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            We Print What<br />
            <span style={{ color: BRAND }}>You Imagine</span>
          </Reveal>

          <Reveal as="p" delay={120} className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Cloud Graphics is a custom printing studio in Amravati, Maharashtra. From a single
            personalised mug to a full corporate merchandise run, we handle design, print and
            delivery under one roof — so your idea reaches you finished, not half-done.
          </Reveal>

          <Reveal delay={240} className="flex flex-row gap-4 sm:gap-5 justify-center mt-8">
            <Link
              to="/products"
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-7 py-3 sm:py-3.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap text-white no-underline transition-transform hover:-translate-y-0.5"
              style={{ background: BRAND, boxShadow: "0 4px 18px rgba(6,114,167,0.28)" }}
            >
              Explore Products <IconArrow />
            </Link>
            <Link
              to="/services"
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-7 py-3 sm:py-3.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap no-underline bg-white transition-transform hover:-translate-y-0.5"
              style={{ color: BRAND, border: "1px solid #cfe7f5", boxShadow: "0 2px 10px rgba(15,23,42,0.05)" }}
            >
              Our Services
            </Link>
          </Reveal>
        </div>
        {/* Stats strip — sits inside the hero */}
        <div className="relative w-full border-t border-gray-200/70" style={{ zIndex: 2 }}>
          <RevealGroup delay={320} stagger={90} className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4">
            {STATS.map(({ value, label }) => (
              <div
                key={label}
                className="text-center py-5 px-2 border-r border-b sm:border-b-0 border-gray-200/70 last:border-r-0 even:border-r-0 sm:even:border-r"
              >
                <p className="text-xl md:text-2xl font-black leading-none" style={{ color: BRAND }}>{value}</p>
                <p
                  className="text-[10px] md:text-xs uppercase mt-1.5 text-gray-400 font-semibold"
                  style={{ letterSpacing: "0.1em" }}
                >
                  {label}
                </p>
              </div>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ── OUR STORY ── */}
      <div className="max-w-5xl mx-auto px-5 md:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-10 items-start">
          <Reveal variant="left">
            <p className="text-[11px] font-bold uppercase mb-3" style={{ color: BRAND, letterSpacing: "0.15em" }}>
              Our Story
            </p>
            <h2
              className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mb-5"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              A local print shop that grew online
            </h2>
            <div className="space-y-4 text-sm md:text-[15px] text-gray-600 leading-relaxed">
              <p>
                Cloud Graphics started at Shivaji Chowk in Amravati, doing what print shops do —
                visiting cards, banners, and the occasional rush job before a wedding. Customers
                kept asking for one more thing: something personal. A mug with a photo. A team
                t-shirt. A diary with the company logo on the cover.
              </p>
              <p>
                So we built for that. Today you can pick a product, upload your artwork, and see
                exactly what you are ordering before you pay — no back-and-forth over chat, no
                guessing how it will turn out. The same people who ran the counter still run the
                press, which is why proof checks and reprints are handled the way they always were.
              </p>
              <p>
                We ship across India, and we still take walk-ins. Whichever way you reach us, the
                job gets the same attention.
              </p>
            </div>
          </Reveal>

          {/* What we print */}
          <Reveal variant="right" delay={120} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-[11px] font-bold uppercase mb-4 text-gray-400" style={{ letterSpacing: "0.15em" }}>
              What We Print
            </p>
            <div className="flex flex-wrap gap-2">
              {OFFERINGS.map((item) => (
                <span
                  key={item}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{ background: "#eff8fd", color: BRAND }}
                >
                  {item}
                </span>
              ))}
            </div>
            <Link
              to="/products"
              className="mt-5 inline-flex items-center gap-2 text-sm font-bold no-underline"
              style={{ color: BRAND }}
            >
              Browse all products <IconArrow />
            </Link>
          </Reveal>
        </div>
      </div>

      {/* ── WHAT WE STAND FOR ── */}
      <div className="bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-5 md:px-8 py-12 md:py-16">
          <Reveal className="text-center mb-10">
            <p className="text-[11px] font-bold uppercase mb-3" style={{ color: BRAND, letterSpacing: "0.15em" }}>
              What We Stand For
            </p>
            <h2
              className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Four things we do not cut corners on
            </h2>
          </Reveal>

          <RevealGroup stagger={110} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {VALUES.map(({ Icon, title, desc }) => (
              <div key={title} className="flex gap-4 p-5 rounded-2xl border border-gray-100 bg-gray-50/60">
                <div
                  className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "#daeffa", color: BRAND }}
                >
                  <Icon />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-gray-900 mb-1.5">{title}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </RevealGroup>
        </div>
      </div>

      {/* ── FIND US ── */}
      <div className="max-w-5xl mx-auto px-5 md:px-8 py-12 md:py-16">
        <Reveal className="text-center mb-10">
          <p className="text-[11px] font-bold uppercase mb-3" style={{ color: BRAND, letterSpacing: "0.15em" }}>
            Find Us
          </p>
          <h2
            className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Come by, or just call
          </h2>
        </Reveal>

        <RevealGroup stagger={100} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CONTACT_INFO.map(({ Icon, label, value }) => (
            <div key={label} className="flex items-start gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div
                className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: "#daeffa", color: BRAND }}
              >
                <Icon />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase text-gray-400 mb-1" style={{ letterSpacing: "0.1em" }}>
                  {label}
                </p>
                <p className="text-sm font-semibold text-gray-800 leading-snug break-words">{value}</p>
              </div>
            </div>
          ))}
        </RevealGroup>
      </div>

      {/* ── CTA ── */}
      <div className="px-5 md:px-8 pb-14">
        <Reveal
          variant="zoom"
          className="max-w-5xl mx-auto rounded-3xl px-6 py-10 md:py-14 text-center overflow-hidden relative bg-white"
          style={{ border: "1px solid #e3f0f8", boxShadow: "0 8px 30px rgba(15,23,42,0.05)" }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(circle at 50% 0%, rgba(6,114,167,0.10), transparent 62%)" }}
          />
          <div className="relative" style={{ zIndex: 2 }}>
            <h2
              className="text-2xl md:text-3xl font-black text-gray-900 mb-3 tracking-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Got something in mind?
            </h2>
            <p className="text-gray-600 text-sm md:text-base max-w-lg mx-auto mb-8 leading-relaxed">
              Tell us what you need printed and we will come back with options, pricing and a timeline.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/products"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-white no-underline"
                style={{ background: BRAND, boxShadow: "0 4px 18px rgba(6,114,167,0.28)" }}
              >
                Start Designing <IconArrow />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm no-underline bg-white"
                style={{ color: BRAND, border: "1px solid #cfe7f5" }}
              >
                Talk To Us
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
