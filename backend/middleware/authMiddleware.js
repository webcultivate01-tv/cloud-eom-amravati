const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Protect routes — user must be logged in
const protect = async (req, res, next) => {
  let token;

  // JWT is sent as Bearer token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1]; // extract token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user to request (exclude password)
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }

      // A blocked account loses access immediately, not just at the next login.
      // Blocking an employee is how an admin suspends them mid-shift, so an
      // already-issued token must stop working the moment the flag is set.
      if (req.user.isBlocked) {
        return res.status(403).json({
          code: "ACCOUNT_BLOCKED",
          message: "Your account has been blocked. Contact support.",
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, invalid token" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token provided" });
  }
};

module.exports = { protect };
