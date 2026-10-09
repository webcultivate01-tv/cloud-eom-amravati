import { useMemo } from "react";
import { useSelector } from "react-redux";
import {
  LayoutDashboard, Package, ShoppingCart, Users, ShieldCheck, UserCog,
  CalendarDays, Tag, Image, Mail, Star, RefreshCw, Download, CreditCard, BarChart3, Truck,
} from "lucide-react";

/**
 * The back-office navigation, shared by the admin panel and the employee panel.
 *
 * `key` is the module key the server knows (backend/config/modules.js) and the
 * one stored on an employee's `permissions`. The same list therefore decides
 * three things at once: what the admin can grant, what the sidebar shows, and
 * which page a route guard will open — so none of them can drift apart.
 *
 * `path` is relative; the panel prefix (/admin or /employee) is added per user,
 * which is what lets both panels render the very same pages.
 *
 * `adminOnly` items are never granted to an employee and never appear in their
 * sidebar — managing staff accounts stays with the admins.
 */
export const PANEL_SECTIONS = [
  {
    label: "Overview",
    items: [
      { key: "dashboard", path: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { key: "orders",    path: "orders",    icon: ShoppingCart,    label: "Orders", orderBadge: true },
      { key: "payments",  path: "payments",  icon: CreditCard,      label: "Payments" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { key: "products",   path: "products",   icon: Package,      label: "Products" },
      { key: "categories", path: "categories", icon: Tag,          label: "Categories" },
      { key: "delivery",   path: "delivery",   icon: Truck,        label: "Delivery Charges" },
      { key: "hero",       path: "hero",      icon: Image,        label: "Hero Section" },
      { key: "events",     path: "events",     icon: CalendarDays, label: "Events" },
    ],
  },
  {
    label: "Customers",
    items: [
      { key: "users",        path: "users",        icon: Users,     label: "Users" },
      { key: "inquiries",    path: "inquiries",    icon: Mail,      label: "Enquiries", inquiryBadge: true },
      { key: "reviews",      path: "reviews",      icon: Star,      label: "Reviews" },
      { key: "replacements", path: "replacements", icon: RefreshCw, label: "Replacements" },
    ],
  },
  {
    label: "System",
    items: [
      { key: "reports",   path: "reports",   icon: BarChart3,   label: "Reports" },
      { key: "admins",    path: "admins",    icon: ShieldCheck, label: "Admin Management",    adminOnly: true },
      { key: "employees", path: "employees", icon: UserCog,     label: "Employee Management", adminOnly: true },
      { key: "export",    path: "export",    icon: Download,    label: "Data Export" },
    ],
  },
];

/** Every grantable module, flattened — the admin-only screens are excluded. */
export const GRANTABLE_MODULES = PANEL_SECTIONS.flatMap((s) =>
  s.items.filter((i) => !i.adminOnly).map((i) => ({ ...i, group: s.label }))
);

export const EMPLOYEE_ROLE_LABELS = {
  manager: "Manager",
};

/** Short label for the top-right badge in the panel header. */
const panelBadge = (user) => {
  if (user?.role === "admin") return user.adminRole === "superAdmin" ? "SUPER" : "ADMIN";
  return (EMPLOYEE_ROLE_LABELS[user?.employeeRole] || "Manager").toUpperCase();
};

/** Title shown in the panel topbar. */
const panelTitle = (user) => {
  if (user?.role === "admin") {
    return user.adminRole === "superAdmin" ? "Admin Panel" : "Sub Admin Panel";
  }
  const role = EMPLOYEE_ROLE_LABELS[user?.employeeRole];
  return role ? `${role} Panel` : "Employee Panel";
};

/**
 * Everything a panel screen needs to know about who is looking at it.
 *
 * Note that `can()` only shapes the UI. The server re-checks the same module
 * on every request, so hiding a link is a convenience and never the control.
 */
export function usePanel() {
  const { user } = useSelector((s) => s.auth);

  return useMemo(() => {
    const isAdmin = user?.role === "admin";
    const isEmployee = user?.role === "employee";
    const base = isEmployee ? "/employee" : "/admin";
    const granted = Array.isArray(user?.permissions) ? user.permissions : [];

    const can = (key) => {
      if (isAdmin) return true;
      if (!isEmployee) return false;
      return granted.includes(key);
    };

    // Sections with absolute links, pruned to what this user may open. A
    // section whose every item was pruned is dropped so the sidebar never
    // shows an empty heading.
    const sections = PANEL_SECTIONS.map((section) => ({
      ...section,
      items: section.items
        .filter((item) => (item.adminOnly ? isAdmin : can(item.key)))
        .map((item) => ({ ...item, to: `${base}/${item.path}` })),
    })).filter((section) => section.items.length > 0);

    const allowed = sections.flatMap((s) => s.items);

    return {
      user,
      isAdmin,
      isEmployee,
      isStaff: isAdmin || isEmployee,
      base,
      can,
      sections,
      /** Where to send this user when they have no particular destination. */
      landingPath: allowed[0]?.to ?? (isEmployee ? "/employee/no-access" : "/"),
      hasAnyAccess: allowed.length > 0,
      badge: panelBadge(user),
      title: panelTitle(user),
    };
  }, [user]);
}

/**
 * Where a freshly signed-in account belongs. Used by the login screen and by
 * anything that needs to bounce a user back to "their" home.
 */
export function homePathFor(user) {
  if (!user) return "/login";
  if (user.role === "admin") return "/admin/dashboard";
  if (user.role !== "employee") return "/";
  if (user.mustChangePassword) return "/employee/set-password";

  const granted = Array.isArray(user.permissions) ? user.permissions : [];
  const first = PANEL_SECTIONS.flatMap((s) => s.items).find(
    (i) => !i.adminOnly && granted.includes(i.key)
  );
  return first ? `/employee/${first.path}` : "/employee/no-access";
}
