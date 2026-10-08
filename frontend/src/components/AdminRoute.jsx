import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { homePathFor } from "../utils/panel";

// Redirects to home if user is not an admin. An employee is sent to their own
// panel instead of the storefront — the admin page they asked for is the one
// they are not allowed, not the back office as a whole.
export default function AdminRoute({ children }) {
  const { user } = useSelector((state) => state.auth);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "employee") return <Navigate to={homePathFor(user)} replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}
