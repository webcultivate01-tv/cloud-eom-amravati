const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    phone: {
      type: String,
      trim: true,
    },
    // 'user' = customer, 'admin' = admin staff, 'employee' = staff member
    // created by an admin, with access only to the modules they were granted
    role: {
      type: String,
      enum: ["user", "admin", "employee"],
      default: "user",
    },
    // Only relevant when role === 'admin'
    adminRole: {
      type: String,
      enum: ["superAdmin", "subAdmin"],
      default: null,
    },

    // ── Employee fields (role === 'employee') ──────────────────
    // Job title inside the shop. There is a single designation — the one
    // manager the admin oversees. What they may actually do is decided by
    // `permissions`, never by this.
    employeeRole: {
      type: String,
      enum: ["manager"],
      default: null,
    },
    // Which panel modules this employee may open. Keys come from
    // config/modules.js and are enforced by requireModule().
    permissions: {
      type: [String],
      default: [],
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    // True while the employee is still on the password the admin typed for
    // them — the employee panel makes them pick their own before it opens.
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    // Which admin created this employee account
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Blocked accounts cannot login — a temporary suspension that leaves the
    // account and its history intact
    isBlocked: {
      type: Boolean,
      default: false,
    },
    // Admin only: when this admin last opened the Orders page. Orders placed
    // after this moment are "new" for them (bell + sidebar badge).
    ordersSeenAt: { type: Date, default: null },
    // Password reset OTP
    resetPasswordOTP: { type: String, default: null },
    resetPasswordOTPExpiry: { type: Date, default: null },
  },
  { timestamps: true }
);

// Accounts created back when supervisor/staff existed are folded into the
// single manager designation, so saving them never trips the enum.
userSchema.pre("validate", function (next) {
  if (this.role === "employee" && this.employeeRole !== "manager") {
    this.employeeRole = "manager";
  }
  next();
});

// Hash the password before saving to DB
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
