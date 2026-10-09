import { confirmDialog } from "../../components/ConfirmDialog";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllReviews,
  approveReview,
  deleteReview,
} from "../../features/review/reviewSlice";
import { toast } from "react-toastify";

const STATUS_CFG = {
  pending:  { cls: "bg-amber-100 text-amber-700",   label: "Pending" },
  approved: { cls: "bg-emerald-100 text-emerald-700", label: "Approved" },
};

const fmt = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

function Stars({ rating }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ color: s <= rating ? "#f59e0b" : "#d1d5db" }}>★</span>
      ))}
    </span>
  );
}

export default function ManageReviews() {
  const dispatch = useDispatch();
  const { allReviews, loading } = useSelector((s) => s.review);

  useEffect(() => { dispatch(fetchAllReviews()); }, [dispatch]);

  const pending  = allReviews.filter((r) => r.status === "pending").length;
  const approved = allReviews.filter((r) => r.status === "approved").length;

  const handleApprove = async (id, name) => {
    const result = await dispatch(approveReview(id));
    if (!result.error) toast.success(`Review by "${name}" approved — now visible on homepage`);
    else toast.error(result.payload);
  };

  const handleDelete = async (id, name) => {
    if (!(await confirmDialog(`Delete review by "${name}"? This cannot be undone.`))) return;
    const result = await dispatch(deleteReview(id));
    if (!result.error) toast.success("Review deleted");
    else toast.error(result.payload);
  };

  return (
    <div className="animate-fade-in-up">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            Reviews
            {pending > 0 && (
              <span className="inline-flex items-center justify-center bg-amber-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[22px]">
                {pending}
              </span>
            )}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {allReviews.length} total · {pending} pending · {approved} approved
          </p>
        </div>
        <button
          className="admin-btn admin-btn-ghost !py-1.5 !text-sm"
          onClick={() => dispatch(fetchAllReviews())}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Reviews",    value: allReviews.length, color: "text-slate-800", bg: "bg-slate-50"   },
          { label: "Pending Approval", value: pending,           color: "text-amber-700", bg: "bg-amber-50"   },
          { label: "Live on Website",  value: approved,          color: "text-emerald-700", bg: "bg-emerald-50" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`admin-card p-5 ${bg}`}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-3xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
            <div className="absolute inset-0 rounded-full border-4 border-t-brand-600 animate-spin" />
          </div>
        </div>
      ) : allReviews.length === 0 ? (
        <div className="admin-card p-16 text-center">
          <p className="text-4xl mb-3">⭐</p>
          <p className="text-slate-500 font-medium">No reviews yet.</p>
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  {["Name", "Email", "Rating", "Message", "Status", "Date", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allReviews.map((review) => {
                  const cfg = STATUS_CFG[review.status] || STATUS_CFG.pending;
                  return (
                    <tr
                      key={review._id}
                      className={`border-b border-slate-50 transition-colors ${
                        review.status === "pending"
                          ? "bg-amber-50/30 hover:bg-amber-50/60"
                          : "hover:bg-slate-50/60"
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{review.name}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{review.email}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Stars rating={review.rating} />
                        <span className="text-xs text-slate-400 ml-1">({review.rating}/5)</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[220px]">
                        <p className="line-clamp-2 leading-snug text-xs">{review.message}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`status-badge ${cfg.cls}`}>{cfg.label}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">{fmt(review.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {review.status === "pending" && (
                            <button
                              onClick={() => handleApprove(review._id, review.name)}
                              className="admin-btn bg-emerald-50 hover:bg-emerald-100 text-emerald-700 !py-1 !px-2.5 !text-xs whitespace-nowrap"
                            >
                              ✓ Approve
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(review._id, review.name)}
                            className="admin-btn bg-brand-50 hover:bg-brand-100 text-brand-600 !py-1 !px-2.5 !text-xs"
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tip for pending reviews */}
      {pending > 0 && (
        <div className="mt-4 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <span className="text-base leading-none mt-0.5">💡</span>
          <span>
            <strong>{pending} review{pending !== 1 ? "s" : ""}</strong> pending approval.
            Approved reviews appear instantly on the homepage Customer Reviews section.
          </span>
        </div>
      )}
    </div>
  );
}
