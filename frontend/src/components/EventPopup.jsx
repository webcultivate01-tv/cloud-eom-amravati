import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import { X, ArrowRight, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchActiveEvents } from "../features/events/eventSlice";
import { resolveLink } from "../utils/links";
import logoWhite from "../assets/logo-white.png";

/* The offer announcement, front and centre.

   Events also appear inline on the home page, but an offer nobody scrolls to is
   an offer nobody sees — so an active event opens as a full-screen card the
   moment a visitor lands anywhere on the public site, and closes with the cross.

   Once dismissed it stays dismissed for that browser. The stored key carries the
   event's updatedAt, so editing an event in the admin panel makes it a new
   announcement and it shows again to everyone who had closed the old one. */

const STORAGE_KEY = "cg_dismissed_events";

// Let the page paint first — a modal that is already there on arrival reads as
// an error rather than an offer.
const OPEN_DELAY_MS = 900;

/* localStorage is unavailable in private windows and some in-app browsers. The
   popup still has to work there; it just cannot remember the dismissal. */
const readDismissed = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeDismissed = (list) => {
  try {
    // Only the most recent handful matter — older events are gone from the API
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-30)));
  } catch {
    /* nothing to do — the popup simply reappears on the next visit */
  }
};

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

export default function EventPopup() {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const { events } = useSelector((s) => s.events);

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(readDismissed);

  // The admin pages load every event, active or not, into this same slice — so
  // the popup stays out of the panel entirely rather than fighting over it.
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    if (!isAdmin) dispatch(fetchActiveEvents());
  }, [dispatch, isAdmin]);

  // An event counts as unseen until this exact version of it has been closed
  const keyFor = (ev) => `${ev._id}:${ev.updatedAt || ev.createdAt || ""}`;

  const unseen = useMemo(() => {
    if (isAdmin) return [];
    return (events || []).filter((ev) => !dismissed.includes(keyFor(ev)));
  }, [events, dismissed, isAdmin]);

  useEffect(() => {
    if (!unseen.length) return undefined;
    const timer = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [unseen.length]);

  // Closing dismisses every event currently queued: a visitor who shuts the
  // popup wants it gone, not replaced by the next one.
  const closeAll = () => {
    const next = [...dismissed, ...unseen.map(keyFor)];
    setDismissed(next);
    writeDismissed(next);
    setOpen(false);
  };

  // Escape closes it, and the page behind must not scroll while it is open
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") closeAll();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (isAdmin || !open || !unseen.length) return null;

  const event = unseen[Math.min(index, unseen.length - 1)];
  const link = resolveLink(event.link);

  const ctaClass =
    "inline-flex items-center justify-center gap-1.5 w-full " +
    "bg-brand-600 hover:bg-brand-700 text-white no-underline font-bold text-[13px] " +
    "px-5 py-2.5 rounded-lg shadow-md shadow-brand-600/25 hover:shadow-lg " +
    "transition-all duration-200";

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6"
      style={{ background: "rgba(8, 44, 62, 0.62)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && closeAll()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cg-event-title"
    >
      {/* A small card, the size other sites use for an offer — big enough to
          read at a glance, small enough that it never feels like a wall */}
      <div className="relative w-full max-w-[340px] max-h-[86vh] overflow-y-auto rounded-2xl bg-white shadow-2xl animate-fade-in-up">

        {/* Close — layered above the artwork so it can never be lost against a
            busy image, and kept comfortably tappable on a phone */}
        <button
          type="button"
          onClick={closeAll}
          aria-label="Close announcement"
          className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-white/95 text-slate-700
                     shadow-md ring-1 ring-black/5 flex items-center justify-center
                     hover:bg-white hover:text-brand-700 active:scale-95
                     transition-all duration-200"
        >
          <X size={16} strokeWidth={2.5} />
        </button>

        {/* Brand bar — the announcement reads as coming from Cloud Graphics
            Amravati, not as an anonymous interstitial */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-900 via-brand-700 to-brand-500">
          <img src={logoWhite} alt="Cloud Graphics" className="h-7 w-auto" />
          <span className="h-4 w-px bg-white/25" />
          <span className="text-white/85 text-[9px] font-semibold uppercase tracking-[0.2em]">
            Amravati
          </span>
        </div>

        {event.image && (
          <div className="bg-slate-100">
            <img
              src={event.image}
              alt={event.title}
              className="w-full max-h-[190px] object-contain"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          </div>
        )}

        <div className="p-4 text-center">
          {event.badge && (
            <span className="inline-block bg-brand-50 text-brand-700 ring-1 ring-brand-200
                             text-[9px] font-black uppercase tracking-[0.16em] px-2.5 py-1 rounded-full mb-2">
              {event.badge}
            </span>
          )}

          <h2
            id="cg-event-title"
            className="text-xl font-black text-slate-900 leading-snug mb-1.5"
            // Playfair's default numerals are old-style (digits rise and dip), which
            // makes prices like ₹199 hard to read — force lining figures
            style={{
              fontFamily: "'Playfair Display', serif",
              fontVariantNumeric: "lining-nums",
              fontFeatureSettings: "'lnum' 1",
            }}
          >
            {event.title}
          </h2>

          {event.description && (
            <p className="text-slate-600 text-[13px] leading-relaxed whitespace-pre-wrap line-clamp-3">
              {event.description}
            </p>
          )}

          {event.expiresAt && (
            <p className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 ring-1 ring-amber-200
                          text-[10px] font-bold px-2.5 py-1 rounded-full mt-3">
              <Clock size={11} /> Valid till {formatDate(event.expiresAt)}
            </p>
          )}

          <div className="flex flex-col items-center gap-1 mt-4">
            {link && (
              link.external ? (
                <a href={link.to} target="_blank" rel="noopener noreferrer" className={ctaClass}>
                  Grab this offer <ArrowRight size={14} />
                </a>
              ) : (
                <Link to={link.to} onClick={closeAll} className={ctaClass}>
                  Grab this offer <ArrowRight size={14} />
                </Link>
              )
            )}
            <button
              type="button"
              onClick={closeAll}
              className="text-slate-400 hover:text-slate-700 font-semibold text-xs px-4 py-2 transition-colors"
            >
              No thanks
            </button>
          </div>

          {/* Paging, only when more than one offer is live at once */}
          {unseen.length > 1 && (
            <div className="flex items-center justify-center gap-2.5 mt-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                aria-label="Previous announcement"
                className="w-7 h-7 rounded-full border border-slate-200 text-slate-500 flex items-center justify-center
                           hover:border-brand-300 hover:text-brand-700 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={13} />
              </button>
              <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                {index + 1} / {unseen.length}
              </span>
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(unseen.length - 1, i + 1))}
                disabled={index === unseen.length - 1}
                aria-label="Next announcement"
                className="w-7 h-7 rounded-full border border-slate-200 text-slate-500 flex items-center justify-center
                           hover:border-brand-300 hover:text-brand-700 disabled:opacity-30 transition-all"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
