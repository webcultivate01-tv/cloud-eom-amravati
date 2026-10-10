import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer, cssTransition } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import MobileBottomNav from "./components/MobileBottomNav";
import PrivateRoute from "./components/PrivateRoute";
import AdminRoute from "./components/AdminRoute";
import EmployeeRoute, { EmployeeOnlyRoute, EmployeeLanding } from "./components/EmployeeRoute";
import AdminLayout from "./components/AdminLayout";
import PageTitle from "./components/PageTitle";
import EventPopup from "./components/EventPopup";
import ConfirmHost from "./components/ConfirmDialog";

// ── User / Public Pages ──────────────────────────────────────
// Everything except Home is code-split so the first visit downloads only what it needs
// (the admin bundle, with its charts, is never sent to shoppers).
import Home from "./pages/Home";
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderHistory = lazy(() => import("./pages/OrderHistory"));
const Profile = lazy(() => import("./pages/Profile"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Contact = lazy(() => import("./pages/Contact"));
const About = lazy(() => import("./pages/About"));
const Services = lazy(() => import("./pages/Services"));
const Replacements = lazy(() => import("./pages/Replacements"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));

const TermsConditions = lazy(() => import("./pages/TermsConditions"));
const ShippingPolicy = lazy(() => import("./pages/ShippingPolicy"));
const ReturnPolicy = lazy(() => import("./pages/ReturnPolicy"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const ManageProducts = lazy(() => import("./pages/admin/ManageProducts"));
const ManageOrders = lazy(() => import("./pages/admin/ManageOrders"));
const ManagePayments = lazy(() => import("./pages/admin/ManagePayments"));
const ManageUsers = lazy(() => import("./pages/admin/ManageUsers"));
const ManageAdmins = lazy(() => import("./pages/admin/ManageAdmins"));
const ManageEmployees = lazy(() => import("./pages/admin/ManageEmployees"));
const ManageEvents = lazy(() => import("./pages/admin/ManageEvents"));
const ManageCategories = lazy(() => import("./pages/admin/ManageCategories"));
const ManageHero = lazy(() => import("./pages/admin/ManageHero"));
const ManageDelivery = lazy(() => import("./pages/admin/ManageDelivery"));
const ManageCoupons = lazy(() => import("./pages/admin/ManageCoupons"));
const ManageInquiries = lazy(() => import("./pages/admin/ManageInquiries"));
const ManageReviews = lazy(() => import("./pages/admin/ManageReviews"));
const ManageReplacements = lazy(() => import("./pages/admin/ManageReplacements"));
const DataExport = lazy(() => import("./pages/admin/DataExport"));
const Reports = lazy(() => import("./pages/admin/Reports"));

// ── Employee panel ───────────────────────────────────────────
// The sections themselves are the admin pages above — an employee sees the
// same screens inside the same shell, pruned to the modules they were granted.
const EmployeeSetPassword = lazy(() => import("./pages/employee/SetPassword"));
const EmployeeNoAccess = lazy(() => import("./pages/employee/NoAccess"));

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

/* Same page, same shell — but gated on the one module the section belongs to,
   which is the key the admin granted and the key the API checks. */
const EmployeePage = ({ module, children }) => (
  <EmployeeRoute module={module}>
    <AdminLayout>{children}</AdminLayout>
  </EmployeeRoute>
);

export default function App() {
  return (
    <BrowserRouter>
      {/* Keeps the browser-tab title and meta description in step with the route */}
      <PageTitle />
      {/* Active offers/announcements, shown once per visitor on the public site */}
      <EventPopup />
      {/* In-site confirmation dialog used instead of the browser's native confirm() */}
      <ConfirmHost />
      <Suspense fallback={<div style={{ minHeight: "60vh" }} aria-busy="true" />}>
      <Routes>
        {/* ── Admin routes — no Navbar/Footer, use AdminLayout sidebar ── */}
        <Route path="/admin/dashboard"  element={<AdminPage><Dashboard /></AdminPage>} />
        <Route path="/admin/products"   element={<AdminPage><ManageProducts /></AdminPage>} />
        <Route path="/admin/orders"     element={<AdminPage><ManageOrders /></AdminPage>} />
        <Route path="/admin/payments"   element={<AdminPage><ManagePayments /></AdminPage>} />
        <Route path="/admin/users"      element={<AdminPage><ManageUsers /></AdminPage>} />
        <Route path="/admin/admins"     element={<AdminPage><ManageAdmins /></AdminPage>} />
        <Route path="/admin/employees"  element={<AdminPage><ManageEmployees /></AdminPage>} />
        <Route path="/admin/events"      element={<AdminPage><ManageEvents /></AdminPage>} />
        <Route path="/admin/categories"  element={<AdminPage><ManageCategories /></AdminPage>} />
        <Route path="/admin/hero"        element={<AdminPage><ManageHero /></AdminPage>} />
        <Route path="/admin/delivery"    element={<AdminPage><ManageDelivery /></AdminPage>} />
        <Route path="/admin/coupons"     element={<AdminPage><ManageCoupons /></AdminPage>} />
        <Route path="/admin/inquiries"   element={<AdminPage><ManageInquiries /></AdminPage>} />
        <Route path="/admin/reviews"       element={<AdminPage><ManageReviews /></AdminPage>} />
        <Route path="/admin/replacements" element={<AdminPage><ManageReplacements /></AdminPage>} />
        <Route path="/admin/reports"      element={<AdminPage><Reports /></AdminPage>} />
        <Route path="/admin/export"       element={<AdminPage><DataExport /></AdminPage>} />

        {/* ── Employee panel — same pages and shell as the admin panel, each
             section behind the module the admin granted ── */}
        <Route path="/employee"               element={<EmployeeOnlyRoute><EmployeeLanding /></EmployeeOnlyRoute>} />
        <Route path="/employee/set-password"  element={<EmployeeOnlyRoute><EmployeeSetPassword /></EmployeeOnlyRoute>} />
        <Route path="/employee/no-access"     element={<EmployeeOnlyRoute><EmployeeNoAccess /></EmployeeOnlyRoute>} />

        <Route path="/employee/dashboard"    element={<EmployeePage module="dashboard"><Dashboard /></EmployeePage>} />
        <Route path="/employee/orders"       element={<EmployeePage module="orders"><ManageOrders /></EmployeePage>} />
        <Route path="/employee/payments"     element={<EmployeePage module="payments"><ManagePayments /></EmployeePage>} />
        <Route path="/employee/products"     element={<EmployeePage module="products"><ManageProducts /></EmployeePage>} />
        <Route path="/employee/categories"   element={<EmployeePage module="categories"><ManageCategories /></EmployeePage>} />
        <Route path="/employee/hero"         element={<EmployeePage module="hero"><ManageHero /></EmployeePage>} />
        <Route path="/employee/delivery"     element={<EmployeePage module="delivery"><ManageDelivery /></EmployeePage>} />
        <Route path="/employee/coupons"      element={<EmployeePage module="coupons"><ManageCoupons /></EmployeePage>} />
        <Route path="/employee/events"       element={<EmployeePage module="events"><ManageEvents /></EmployeePage>} />
        <Route path="/employee/users"        element={<EmployeePage module="users"><ManageUsers /></EmployeePage>} />
        <Route path="/employee/inquiries"    element={<EmployeePage module="inquiries"><ManageInquiries /></EmployeePage>} />
        <Route path="/employee/reviews"      element={<EmployeePage module="reviews"><ManageReviews /></EmployeePage>} />
        <Route path="/employee/replacements" element={<EmployeePage module="replacements"><ManageReplacements /></EmployeePage>} />
        <Route path="/employee/reports"      element={<EmployeePage module="reports"><Reports /></EmployeePage>} />
        <Route path="/employee/export"       element={<EmployeePage module="export"><DataExport /></EmployeePage>} />

        {/* ── Public + User routes — use Navbar/Footer ── */}
        <Route path="/*" element={
          <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <Navbar />
            <main style={{ flex: 1 }}>
              <Suspense fallback={<div style={{ minHeight: "60vh" }} aria-busy="true" />}>
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
              </Suspense>
            </main>
            <Footer />
            {/* Spacer so the fixed mobile tab bar never covers page content */}
            <div className="lg:hidden" style={{ height: "calc(64px + env(safe-area-inset-bottom))" }} aria-hidden="true" />
            <MobileBottomNav />
          </div>
        } />
      </Routes>
      </Suspense>

      {/* Compact brand toast — top-centre, one line, auto-dismiss */}
      <ToastContainer
        position="top-center"
        autoClose={2000}
        limit={1}
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
