const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const compression = require("compression");
const path = require("path");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();

app.use(compression()); // gzip/deflate JSON + text responses
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static image store ──────────────────────────────────────
// Everything uploaded by admins/customers lives in backend/uploads/<folder>
// and is served publicly at /uploads/<folder>/<file>
app.use("/uploads", express.static(path.join(__dirname, "uploads"), { maxAge: "7d" }));

// ── Core routes ─────────────────────────────────────────────
app.use("/api/auth",     require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/orders",   require("./routes/orderRoutes"));
app.use("/api/upload",   require("./routes/uploadRoutes"));

// ── Admin management routes ──────────────────────────────────
app.use("/api/users",    require("./routes/userRoutes"));
app.use("/api/admins",   require("./routes/adminRoutes"));
app.use("/api/employees", require("./routes/employeeRoutes"));
app.use("/api/events",   require("./routes/eventRoutes"));
app.use("/api/hero",     require("./routes/heroRoutes"));
app.use("/api/shipment",    require("./routes/shipmentRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/delivery",   require("./routes/deliveryRoutes"));
app.use("/api/payment",    require("./routes/paymentRoutes"));
app.use("/api/inquiry",   require("./routes/inquiryRoutes"));
app.use("/api/review",       require("./routes/reviewRoutes"));
app.use("/api/replacement",  require("./routes/replacementRoutes"));
app.use("/api/export",       require("./routes/exportRoutes"));
app.use("/api/invoice",      require("./routes/invoiceRoutes"));
app.use("/api/reports",      require("./routes/reportRoutes"));

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Cloud Graphics Amravati API is running 🚀" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
