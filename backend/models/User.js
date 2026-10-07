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
    // 'user' = customer, 'admin' = admin staff
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    // Only relevant when role === 'admin'
    adminRole: {
      type: String,
      enum: ["superAdmin", "subAdmin"],
      default: null,
    },
    // Blocked users cannot login
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
