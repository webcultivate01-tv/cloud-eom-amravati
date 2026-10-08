import { Link } from "react-router-dom";
import Reveal, { RevealGroup } from "../components/Reveal";

const BRAND = "#05618e";

/* ── SVG Icons ── */
const IconLogo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/>
    <path d="M12 3v5.5M12 15.5V21M3 12h5.5M15.5 12H21"/>
  </svg>
);
const IconBrand = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.6 6.1 6.4.6-4.9 4.3 1.5 6.4L12 16l-5.6 3.4 1.5-6.4L3 8.7l6.4-.6z"/>
  </svg>
);
const IconSocial = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="4"/>
    <circle cx="12" cy="12" r="3.6"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/>
  </svg>
);
const IconPackaging = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);
const IconApparel = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3l4 2 4-2 5 3-2.5 4L17 9v12H7V9l-1.5 1L3 6z"/>
  </svg>
);
const IconBanner = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="12" rx="2"/><line x1="12" y1="16" x2="12" y2="21"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
  </svg>
);
const IconLayout = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>
    <line x1="9" y1="21" x2="9" y2="9"/>
  </svg>
);
const IconRetouch = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.8"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);
const IconArrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

/* The design side of the studio — what we make before anything reaches the press */
const SERVICES = [
  {
    Icon: IconLogo,
    title: "Logo & Identity Design",
    desc: "A mark built to work everywhere — on a signboard, a business card, and a 40px app icon. Delivered with the full file set, not one flat JPG.",
    points: ["Concept rounds till it's right", "Vector AI / EPS / SVG masters", "Light, dark & mono lockups"],
  },
  {
    Icon: IconBrand,
    title: "Brand Kits & Guidelines",
    desc: "Colours, type, spacing and tone written down, so every vendor you hand it to prints the same brand.",
    points: ["Palette with print + screen values", "Typography scale", "Do / don't usage sheet"],
  },
  {
    Icon: IconSocial,
    title: "Social Media Creatives",
    desc: "Festival posts, offer creatives and launch announcements, sized for every feed and story with no awkward crops.",
    points: ["Post, story & reel-cover sizes", "Monthly creative packs", "Editable source files"],
  },
  {
    Icon: IconLayout,
    title: "Stationery & Print Layout",
    desc: "Visiting cards, letterheads, bill books, envelopes and menu cards — laid out with real bleed and safe margins.",
    points: ["Press-ready CMYK PDFs", "Bleed & crop marks included", "Proof before it goes to press"],
  },
  {
    Icon: IconPackaging,
    title: "Packaging & Label Design",
    desc: "Boxes, pouches, jars and stickers designed onto the actual die-line, so the artwork lands where the fold does.",
    points: ["Die-line accurate artwork", "Barcode & statutory panels", "3D mockup preview"],
  },
  {
    Icon: IconApparel,
    title: "Apparel & Merch Graphics",
    desc: "T-shirt prints, team kits, hoodie graphics and corporate merch, prepared for the print method you're actually using.",
    points: ["DTF, screen & sublimation ready", "Placement + size charts", "Colour-separated files"],
  },
  {
    Icon: IconBanner,
    title: "Banners, Flex & Standees",
    desc: "Large-format artwork built at the right resolution, so a 10-foot flex stays as sharp as a postcard.",
    points: ["Scaled to exact site size", "High-DPI source artwork", "Same-day design on rush jobs"],
  },
  {
    Icon: IconRetouch,
    title: "Photo Editing & Retouching",
    desc: "Background removal, colour correction and product clean-up — the step that makes a catalogue look like a catalogue.",
    points: ["Clipping & background swap", "Colour and light correction", "Bulk catalogue rates"],
  },
];

const PROCESS = [
  { step: "01", title: "Tell us the brief", desc: "Share the idea over call, WhatsApp or the enquiry form. References welcome — so is a rough sketch on paper." },
  { step: "02", title: "We design it", desc: "You get the first concepts to react to. Revisions are part of the job, not an extra line on the bill." },
  { step: "03", title: "Approve the proof", desc: "A final proof goes out before anything is printed. What you approve is exactly what runs." },
  { step: "04", title: "Print & deliver", desc: "Design-only? You get the files. Printing too? It goes straight to our press and ships to your door." },
];

const DELIVERABLES = [
  "AI / EPS / PDF", "Print-ready CMYK", "SVG vectors", "PNG (transparent)",
  "JPG for web", "Layered PSD", "Font files", "3D mockups",
];

export default function Services() {
  return (
    <div className="bg-gray-50 min-h-screen" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── HERO ── */}
      <section
        className="relative overflow-hidden flex items-center"
        style={{
          minHeight: "60vh",
          background: "linear-gradient(180deg, #f4fafd 0%, #ffffff 100%)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 15% 12%, rgba(5, 97, 142,0.10), transparent 55%), radial-gradient(circle at 85% 85%, rgba(41,163,220,0.08), transparent 50%)",
          }}
        />
        {/* Faint grid — a designer's artboard, not a stock photo */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(5, 97, 142,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(5, 97, 142,0.10) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(circle at 50% 40%, #000 10%, transparent 72%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 40%, #000 10%, transparent 72%)",
          }}
        />

        <div className="relative w-full max-w-5xl mx-auto px-6 py-14 md:py-16 text-center" style={{ zIndex: 2 }}>
          <Reveal
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{ background: "#eff8fd", border: "1px solid #d3ebf8" }}
          >
            <div className="w-2 h-2 rounded-full" style={{ background: BRAND }} />
            <span className="text-[11px] font-bold uppercase" style={{ color: BRAND, letterSpacing: "0.12em" }}>
              Graphic Design Studio
            </span>
          </Reveal>

          <Reveal
            as="h1"
            delay={100}
            className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 mb-5 tracking-tight leading-[1.05]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Design that survives<br />
            <span style={{ color: BRAND }}>the printing press</span>
          </Reveal>

          <Reveal as="p" delay={200} className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto leading-relaxed mb-8">
            Anyone can hand you a pretty JPG. We design in vectors, on real die-lines, at the right
            resolution — so the file that looks good on your screen still looks good at ten feet wide.
          </Reveal>

          <Reveal delay={300} className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-white no-underline transition-transform hover:-translate-y-0.5"
              style={{ background: BRAND, boxShadow: "0 4px 18px rgba(5, 97, 142,0.28)" }}
            >
              Start a Project <IconArrow />
            </Link>
            <Link
              to="/products"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm no-underline bg-white transition-transform hover:-translate-y-0.5"
              style={{ color: BRAND, border: "1px solid #cfe7f5", boxShadow: "0 2px 10px rgba(15,23,42,0.05)" }}
            >
              Browse Products
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── SERVICES GRID ── */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-14 md:py-20">
        <Reveal className="text-center mb-11">
          <p className="text-[11px] font-bold uppercase mb-3" style={{ color: BRAND, letterSpacing: "0.15em" }}>
            What We Design
          </p>
          <h2
            className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Eight things we do properly
          </h2>
        </Reveal>

        <RevealGroup stagger={80} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SERVICES.map(({ Icon, title, desc, points }) => (
            <div
              key={title}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-[#b0def4]"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors duration-200 group-hover:text-white"
                style={{ background: "#daeffa", color: BRAND }}
                onMouseEnter={(e) => { e.currentTarget.style.background = BRAND; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#daeffa"; }}
              >
                <Icon />
              </div>
              <p className="text-[15px] font-bold text-gray-900 mb-2 leading-snug">{title}</p>
              <p className="text-[13px] text-gray-500 leading-relaxed mb-4 flex-1">{desc}</p>
              <ul className="flex flex-col gap-2 m-0 p-0 list-none">
                {points.map((pt) => (
                  <li key={pt} className="flex items-start gap-2 text-[12px] font-semibold text-gray-600">
                    <span className="shrink-0 mt-0.5" style={{ color: BRAND }}><IconCheck /></span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </RevealGroup>
      </section>

      {/* ── PROCESS ── */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-5 md:px-8 py-14 md:py-20">
          <Reveal className="text-center mb-11">
            <p className="text-[11px] font-bold uppercase mb-3" style={{ color: BRAND, letterSpacing: "0.15em" }}>
              How It Works
            </p>
            <h2
              className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Brief to delivery, in four steps
            </h2>
          </Reveal>

          <RevealGroup stagger={120} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PROCESS.map(({ step, title, desc }, i) => (
              <div key={step} className="relative">
                {/* Connector — desktop only, never after the last card */}
                {i < PROCESS.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-[calc(50%+28px)] right-[-14px] h-px" style={{ background: "#daeffa" }} />
                )}
                <div className="relative text-center lg:text-left">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm mb-4 mx-auto lg:mx-0 relative z-10"
                    style={{ background: BRAND, color: "#fff", boxShadow: "0 6px 16px rgba(5, 97, 142,0.30)" }}
                  >
                    {step}
                  </div>
                  <p className="text-[15px] font-bold text-gray-900 mb-2">{title}</p>
                  <p className="text-[13px] text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ── DELIVERABLES ── */}
      <section className="max-w-5xl mx-auto px-5 md:px-8 py-14 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-10 items-center">
          <Reveal variant="left">
            <p className="text-[11px] font-bold uppercase mb-3" style={{ color: BRAND, letterSpacing: "0.15em" }}>
              What You Get
            </p>
            <h2
              className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mb-5"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              You own the files. All of them.
            </h2>
            <div className="space-y-4 text-sm md:text-[15px] text-gray-600 leading-relaxed">
              <p>
                Every design job ends with the source files handed over — editable vectors, layered
                artwork, and the exported formats you'll actually need. No watermarks, no "pay again
                to get the AI file", no holding your logo hostage.
              </p>
              <p>
                If we print the job too, the press-ready version goes straight into production. If you
                take it elsewhere later, the files work there just the same.
              </p>
            </div>
            <Link
              to="/contact"
              className="mt-6 inline-flex items-center gap-2 text-sm font-bold no-underline"
              style={{ color: BRAND }}
            >
              Ask for a quote <IconArrow />
            </Link>
          </Reveal>

          <Reveal variant="right" delay={120} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-[11px] font-bold uppercase mb-4 text-gray-400" style={{ letterSpacing: "0.15em" }}>
              File Formats
            </p>
            <div className="flex flex-wrap gap-2">
              {DELIVERABLES.map((item) => (
                <span
                  key={item}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{ background: "#eff8fd", color: BRAND }}
                >
                  {item}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-5 md:px-8 pb-14">
        <Reveal
          variant="zoom"
          className="max-w-5xl mx-auto rounded-3xl px-6 py-10 md:py-14 text-center overflow-hidden relative bg-white"
          style={{ border: "1px solid #e3f0f8", boxShadow: "0 8px 30px rgba(15,23,42,0.05)" }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(circle at 50% 0%, rgba(5, 97, 142,0.10), transparent 62%)" }}
          />
          <div className="relative" style={{ zIndex: 2 }}>
            <h2
              className="text-2xl md:text-3xl font-black text-gray-900 mb-3 tracking-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Have something to design?
            </h2>
            <p className="text-gray-600 text-sm md:text-base max-w-lg mx-auto mb-8 leading-relaxed">
              Send the brief across and we'll come back with a direction, a price and a timeline —
              usually within 24–48 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-white no-underline"
                style={{ background: BRAND, boxShadow: "0 4px 18px rgba(5, 97, 142,0.28)" }}
              >
                Talk To Us <IconArrow />
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm no-underline bg-white"
                style={{ color: BRAND, border: "1px solid #cfe7f5" }}
              >
                About The Studio
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
