const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendPasswordResetOTP } = require("../config/mailer");

// Helper: generate a JWT token for a user
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

/**
 * The session payload the frontend stores and routes on.
 *
 * Built in one place so login, profile fetch and profile save can never
 * disagree about which panel a user belongs to or what they may open.
 * `permissions` is what the employee sidebar and route guards read — the
 * server still re-checks every request, so this is for the UI, not security.
 */
const sessionPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  adminRole: user.adminRole,
  employeeRole: user.employeeRole,
  permissions: user.role === "employee" ? user.permissions || [] : [],
  mustChangePassword: !!user.mustChangePassword,
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Create user (password hashing is handled by the User model pre-save hook)
    const user = await User.create({ name, email, password, phone });

    res.status(201).json({
      ...sessionPayload(user),
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Compare entered password with stored hash
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Blocked users cannot login
    if (user.isBlocked) {
      return res.status(403).json({ message: "Your account has been blocked. Contact support." });
    }

    res.json({
      ...sessionPayload(user),
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged-in user's profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  res.json(sessionPayload(req.user));
};

// @desc    Update logged-in user's profile (name, phone, password)
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, phone, currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name && name.trim()) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();

    // Password change — requires current password verification
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required to set a new password" });
      }
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }
      user.password = newPassword;
      // Setting their own password is what retires the temporary one the
      // admin handed over, and what opens the employee panel.
      user.mustChangePassword = false;
    }

    await user.save();

    res.json(sessionPayload(user));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send password reset OTP to email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always respond with success to prevent email enumeration
    if (!user) return res.json({ message: "If this email is registered, an OTP has been sent." });

    const otp = crypto.randomInt(100000, 999999).toString();
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await user.save();

    await sendPasswordResetOTP({ toEmail: user.email, toName: user.name, otp });

    res.json({ message: "If this email is registered, an OTP has been sent." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify OTP and reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return res.status(400).json({ message: "Email, OTP and new password are required" });
    if (newPassword.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(400).json({ message: "Invalid OTP or email" });

    if (!user.resetPasswordOTP || user.resetPasswordOTP !== otp.trim())
      return res.status(400).json({ message: "Invalid OTP" });

    if (!user.resetPasswordOTPExpiry || new Date() > user.resetPasswordOTPExpiry)
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });

    user.password = newPassword;
    user.resetPasswordOTP = null;
    user.resetPasswordOTPExpiry = null;
    await user.save();

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login, getProfile, updateProfile, forgotPassword, resetPassword };
