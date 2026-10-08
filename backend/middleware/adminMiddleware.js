const { MODULE_KEYS } = require("../config/modules");

/**
 * Panel access guards. All of these must run AFTER `protect`, which puts the
 * account on req.user.
 *
 * Two kinds of account can open the panel:
 *   admin    — full access to everything, always
 *   employee — access only to the modules the admin granted them
 *
 * A route therefore declares which module it belongs to rather than simply
 * "admins only", so one tag drives both the API and the employee sidebar.
 */

/** Admin or employee — any account that belongs in a panel at all. */
const isStaff = (user) => !!user && (user.role === "admin" || user.role === "employee");

/** Does this account carry a given module? Admins carry all of them. */
const hasModule = (user, moduleKey) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role !== "employee") return false;
  return Array.isArray(user.permissions) && user.permissions.includes(moduleKey);
};

/** Admin-only guard — used for things an employee may never do (managing
 *  admins, managing employees). */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") return next();
  res.status(403).json({ message: "Access denied: Admins only" });
};

/** Super-admin-only guard, for the account-management screens. */
const superAdminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin" && req.user.adminRole === "superAdmin") return next();
  res.status(403).json({ message: "Access denied: Super Admins only" });
};

/** Admin or any (unblocked) employee — for data every panel user can read. */
const staffOnly = (req, res, next) => {
  if (!isStaff(req.user)) {
    return res.status(403).json({ message: "Access denied: Staff only" });
  }
  if (req.user.isBlocked) {
    return res.status(403).json({ message: "Your account has been blocked. Contact the administrator." });
  }
  next();
};

/**
 * Guards a route behind one module. Admins pass; an employee passes only when
 * that module is in their `permissions`.
 *
 *   router.get("/", protect, requireModule("orders"), getAllOrders);
 */
const requireModule = (moduleKey) => {
  if (!MODULE_KEYS.includes(moduleKey)) {
    // A typo here would silently hand out access, so fail at boot instead.
    throw new Error(`requireModule: unknown module "${moduleKey}"`);
  }
  return (req, res, next) => {
    if (!isStaff(req.user)) {
      return res.status(403).json({ message: "Access denied: Staff only" });
    }
    if (req.user.isBlocked) {
      return res.status(403).json({ message: "Your account has been blocked. Contact the administrator." });
    }
    if (!hasModule(req.user, moduleKey)) {
      return res.status(403).json({ message: "You do not have access to this section" });
    }
    next();
  };
};

/**
 * Same as requireModule but satisfied by any one of several modules — for
 * endpoints more than one page reads, e.g. the order totals the Dashboard
 * and the Orders page both show.
 */
const requireAnyModule = (moduleKeys) => {
  moduleKeys.forEach((k) => {
    if (!MODULE_KEYS.includes(k)) throw new Error(`requireAnyModule: unknown module "${k}"`);
  });
  return (req, res, next) => {
    if (!isStaff(req.user)) {
      return res.status(403).json({ message: "Access denied: Staff only" });
    }
    if (req.user.isBlocked) {
      return res.status(403).json({ message: "Your account has been blocked. Contact the administrator." });
    }
    if (!moduleKeys.some((k) => hasModule(req.user, k))) {
      return res.status(403).json({ message: "You do not have access to this section" });
    }
    next();
  };
};

module.exports = {
  adminOnly, superAdminOnly, staffOnly,
  requireModule, requireAnyModule,
  isStaff, hasModule,
};
