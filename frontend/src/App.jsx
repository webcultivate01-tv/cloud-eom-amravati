import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer, cssTransition } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import MobileBottomNav from "./components/MobileBottomNav";
import PrivateRoute from "./components/PrivateRoute";
import AdminRoute from "./components/AdminRoute";
import AdminLayout from "./components/AdminLayout";
import PageTitle from "./components/PageTitle";
import EventPopup from "./components/EventPopup";

// ── User / Public Pages ──────────────────────────────────────
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderHistory from "./pages/OrderHistory";
import Profile from "./pages/Profile";
import Favorites from "./pages/Favorites";
import Contact from "./pages/Contact";
import About from "./pages/About";
import Services from "./pages/Services";
import Replacements from "./pages/Replacements";
import ForgotPassword from "./pages/ForgotPassword";

import TermsConditions from "./pages/TermsConditions";
import ShippingPolicy from "./pages/ShippingPolicy";
import ReturnPolicy from "./pages/ReturnPolicy";
import Dashboard from "./pages/admin/Dashboard";
import ManageProducts from "./pages/admin/ManageProducts";
import ManageOrders from "./pages/admin/ManageOrders";
import ManagePayments from "./pages/admin/ManagePayments";
import ManageUsers from "./pages/admin/ManageUsers";
import ManageAdmins from "./pages/admin/ManageAdmins";
import ManageEvents from "./pages/admin/ManageEvents";
import ManageCategories from "./pages/admin/ManageCategories";
import ManageInquiries from "./pages/admin/ManageInquiries";
import ManageReviews from "./pages/admin/ManageReviews";
import ManageReplacements from "./pages/admin/ManageReplacements";
import DataExport from "./pages/admin/DataExport";
import Reports from "./pages/admin/Reports";

/* Toast motion — drops in from the top-centre and lifts back out.
   Paired with the .cg-toast-* rules in index.css. */
const CGToast = cssTransition({
  enter: "cg-toast-in",
  exit: "cg-toast-out",
  collapseDuration: 200,
});

// Wraps any admin page with the sidebar layout + route guard
const AdminPage = ({ children }) => (
  <AdminRoute>
    <AdminLayout>{children}</AdminLayout>
  </AdminRoute>
);

export default function App() {
  return (
    <BrowserRouter>
      {/* Keeps the browser-tab title and meta description in step with the route */}
      <PageTitle />
      {/* Active offers/announcements, shown once per visitor on the public site */}
      <EventPopup />
      <Routes>
        {/* ── Admin routes — no Navbar/Footer, use AdminLayout sidebar ── */}
        <Route path="/admin/dashboard"  element={<AdminPage><Dashboard /></AdminPage>} />
        <Route path="/admin/products"   element={<AdminPage><ManageProducts /></AdminPage>} />
        <Route path="/admin/orders"     element={<AdminPage><ManageOrders /></AdminPage>} />
        <Route path="/admin/payments"   element={<AdminPage><ManagePayments /></AdminPage>} />
        <Route path="/admin/users"      element={<AdminPage><ManageUsers /></AdminPage>} />
        <Route path="/admin/admins"     element={<AdminPage><ManageAdmins /></AdminPage>} />
        <Route path="/admin/events"      element={<AdminPage><ManageEvents /></AdminPage>} />
        <Route path="/admin/categories"  element={<AdminPage><ManageCategories /></AdminPage>} />
        <Route path="/admin/inquiries"   element={<AdminPage><ManageInquiries /></AdminPage>} />
        <Route path="/admin/reviews"       element={<AdminPage><ManageReviews /></AdminPage>} />
        <Route path="/admin/replacements" element={<AdminPage><ManageReplacements /></AdminPage>} />
        <Route path="/admin/reports"      element={<AdminPage><Reports /></AdminPage>} />
        <Route path="/admin/export"       element={<AdminPage><DataExport /></AdminPage>} />

        {/* ── Public + User routes — use Navbar/Footer ── */}
        <Route path="/*" element={
          <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <Navbar />
            <main style={{ flex: 1 }}>
              <Routes>
                <Route path="/"          element={<Home />} />
                <Route path="/login"     element={<Login />} />
                <Route path="/register"  element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/products"  element={<Products />} />
                <Route path="/products/:id" element={<ProductDetail />} />
                <Route path="/cart"      element={<Cart />} />
                <Route path="/checkout"      element={<PrivateRoute><Checkout /></PrivateRoute>} />
                <Route path="/orders"        element={<PrivateRoute><OrderHistory /></PrivateRoute>} />
                <Route path="/profile"   element={<PrivateRoute><Profile /></PrivateRoute>} />
                <Route path="/favorites"     element={<Favorites />} />
                <Route path="/replacements"  element={<PrivateRoute><Replacements /></PrivateRoute>} />
                <Route path="/contact"       element={<Contact />} />
                <Route path="/about"         element={<About />} />
                <Route path="/services"      element={<Services />} />
                <Route path="/terms"         element={<TermsConditions />} />
                <Route path="/shipping-policy" element={<ShippingPolicy />} />
                <Route path="/return-policy"   element={<ReturnPolicy />} />
                <Route path="*" element={
                  <div style={{ textAlign: "center", padding: "100px", color: "#fff", background: "#0f3460", minHeight: "80vh" }}>
                    <h1>404 — Page Not Found</h1>
                  </div>
                } />
              </Routes>
            </main>
            <Footer />
            {/* Spacer so the fixed mobile tab bar never covers page content */}
            <div className="lg:hidden" style={{ height: "calc(64px + env(safe-area-inset-bottom))" }} aria-hidden="true" />
            <MobileBottomNav />
          </div>
        } />
      </Routes>

      {/* Compact brand toast — top-centre, one line, auto-dismiss */}
      <ToastContainer
        position="top-center"
        autoClose={2000}
        limit={2}
        newestOnTop
        hideProgressBar
        closeButton={false}
        closeOnClick
        pauseOnHover={false}
        pauseOnFocusLoss={false}
        draggable
        transition={CGToast}
        className="cg-toast-container"
        toastClassName="cg-toast"
      />
    </BrowserRouter>
  );
}
