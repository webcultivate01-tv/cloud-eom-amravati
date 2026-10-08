const express = require("express");
const router = express.Router();
const { getAllUsers, getUserById, toggleBlockUser, deleteUser } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const { requireModule } = require("../middleware/adminMiddleware");

router.get("/", protect, requireModule("users"), getAllUsers);
router.get("/:id", protect, requireModule("users"), getUserById);
router.put("/:id/block", protect, requireModule("users"), toggleBlockUser);
router.delete("/:id", protect, requireModule("users"), deleteUser);

module.exports = router;
