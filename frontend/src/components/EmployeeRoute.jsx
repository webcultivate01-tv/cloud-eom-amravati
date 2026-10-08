import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { usePanel, homePathFor } from "../utils/panel";

/**
 * Guard for the employee panel.
 *
 * `module` is the panel module the wrapped page belongs to — the same key the
 * admin granted and the same key the API checks. Three things are settled here
 * before a page renders:
 *
 *   1. only employees get in (an admin is sent to the matching admin page, so
 *      a shared link still works for them);
 *   2. a temporary password must be replaced first;
 *   3. the module must actually be granted.
 *
 * This only tidies the UI. Every request the page makes is checked again on
 * the server, so a hand-typed URL gains nothing.
 */
export default function EmployeeRoute({ module, children }) {
  const { user } = useSelector((s) => s.auth);
  const { can, landingPath } = usePanel();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace />;

  // Admins have their own copy of every one of these pages.
  if (user.role === "admin") {
    return <Navigate to={location.pathname.replace(/^\/employee/, "/admin")} replace />;
  }
  if (user.role !== "employee") return <Navigate to="/" replace />;

  if (user.mustChangePassword) return <Navigate to="/employee/set-password" replace />;

  if (module && !can(module)) return <Navigate to={landingPath} replace />;

  return children;
}

/**
 * `/employee` on its own — sends the signed-in account to the first section it
 * actually holds, so a bookmark to the panel root always lands somewhere real.
 */
export function EmployeeLanding() {
  const { user } = useSelector((s) => s.auth);
  return <Navigate to={homePathFor(user)} replace />;
}

/**
 * Guard for the employee pages that sit outside the module system — the
 * first-login password screen and the "no sections yet" notice. Signed-in
 * employees only, no module required.
 */
export function EmployeeOnlyRoute({ children }) {
  const { user } = useSelector((s) => s.auth);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin/dashboard" replace />;
  if (user.role !== "employee") return <Navigate to="/" replace />;

  return children;
}
