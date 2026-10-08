const User = require("../models/User");
const { MODULES, sanitizePermissions } = require("../config/modules");
const { sendEmployeeCredentials } = require("../config/mailer");

// The shop has exactly one employee designation, and only one account may
// hold it — the admin manages a single manager, not a team of them.
const MANAGER_ROLE = "manager";

/* The fields the panel is allowed to see — never the password hash or the
   reset OTP. */
const PUBLIC_FIELDS =
  "name email phone address role employeeRole permissions isBlocked mustChangePassword createdBy createdAt updatedAt";

const moduleLabels = (keys = []) =>
  MODULES.filter((m) => keys.includes(m.key)).map((m) => m.label);

/* Credentials go out by email as a convenience; a bounced or misconfigured
   SMTP must never undo an account that was already created. */
const mailCredentials = async (payload) => {
  try {
    await sendEmployeeCredentials(payload);
    return true;
  } catch (err) {
    console.error("Employee credentials email failed:", err.message);
    return false;
  }
};

// @desc    The modules an employee can be granted, for the access picker
// @route   GET /api/employees/modules
// @access  Admin
const getModules = (req, res) => {
  res.json(MODULES);
};

// @desc    List every employee account
// @route   GET /api/employees
// @access  Admin
const getAllEmployees = async (req, res) => {
  try {
    const employees = await User.find({ role: "employee" })
      .select(PUBLIC_FIELDS)
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create an employee with a temporary password and module access
// @route   POST /api/employees
// @access  Admin
const createEmployee = async (req, res) => {
  try {
    const { name, email, password, phone, address, permissions } = req.body;

    if (await User.exists({ role: "employee" })) {
      return res.status(400).json({
        message: "A manager already exists. Edit or remove the current manager before adding another.",
      });
    }

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ message: "Temporary password must be at least 6 characters" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const role = MANAGER_ROLE;
    const granted = sanitizePermissions(permissions);

    const employee = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      phone: phone?.trim() || "",
      address: address?.trim() || "",
      role: "employee",
      employeeRole: role,
      permissions: granted,
      // They sign in with what the admin typed, then must replace it.
      mustChangePassword: true,
      createdBy: req.user._id,
    });

    const emailed = await mailCredentials({
      toEmail: employee.email,
      toName: employee.name,
      password,
      employeeRole: role,
      modules: moduleLabels(granted),
    });

    const created = await User.findById(employee._id)
      .select(PUBLIC_FIELDS)
      .populate("createdBy", "name");

    res.status(201).json({ employee: created, emailed });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update an employee's details, job title and module access
// @route   PUT /api/employees/:id
// @access  Admin
const updateEmployee = async (req, res) => {
  try {
    const employee = await User.findOne({ _id: req.params.id, role: "employee" });
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const { name, phone, address, permissions } = req.body;

    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({ message: "Name cannot be empty" });
      employee.name = String(name).trim();
    }
    if (phone !== undefined) employee.phone = String(phone).trim();
    if (address !== undefined) employee.address = String(address).trim();
    employee.employeeRole = MANAGER_ROLE;
    // An empty array is a valid grant — it means "no sections", which is how
    // access is revoked without deleting the account.
    if (permissions !== undefined) employee.permissions = sanitizePermissions(permissions);

    await employee.save();

    const updated = await User.findById(employee._id)
      .select(PUBLIC_FIELDS)
      .populate("createdBy", "name");

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Block or unblock an employee (temporary suspension)
// @route   PUT /api/employees/:id/block
// @access  Admin
const toggleBlockEmployee = async (req, res) => {
  try {
    const employee = await User.findOne({ _id: req.params.id, role: "employee" });
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    employee.isBlocked = !employee.isBlocked;
    await employee.save();

    res.json({
      message: `${employee.name} has been ${employee.isBlocked ? "blocked" : "unblocked"}`,
      _id: employee._id,
      isBlocked: employee.isBlocked,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Issue a fresh temporary password for an employee
// @route   PUT /api/employees/:id/password
// @access  Admin
const resetEmployeePassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ message: "Temporary password must be at least 6 characters" });
    }

    const employee = await User.findOne({ _id: req.params.id, role: "employee" });
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    employee.password = password; // hashed by the User pre-save hook
    employee.mustChangePassword = true;
    employee.resetPasswordOTP = null;
    employee.resetPasswordOTPExpiry = null;
    await employee.save();

    const emailed = await mailCredentials({
      toEmail: employee.email,
      toName: employee.name,
      password,
      employeeRole: employee.employeeRole,
      modules: moduleLabels(employee.permissions),
      isReset: true,
    });

    res.json({
      message: `Temporary password set for ${employee.name}`,
      _id: employee._id,
      mustChangePassword: true,
      emailed,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete an employee account
// @route   DELETE /api/employees/:id
// @access  Admin
const deleteEmployee = async (req, res) => {
  try {
    const employee = await User.findOne({ _id: req.params.id, role: "employee" });
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    await User.findByIdAndDelete(employee._id);
    res.json({ message: `${employee.name} has been removed`, _id: employee._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getModules,
  getAllEmployees,
  createEmployee,
  updateEmployee,
  toggleBlockEmployee,
  resetEmployeePassword,
  deleteEmployee,
};
