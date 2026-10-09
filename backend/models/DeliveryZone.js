const mongoose = require("mongoose");

/**
 * A delivery rate for one pincode, set by the admin.
 *
 * chargeType decides how `charge` is applied to an order shipped to this pincode:
 *   per_unit  → charge × total quantity   (3 mugs at ₹40 = ₹120)
 *   per_order → charge once, however many items are in the order
 */
const deliveryZoneSchema = new mongoose.Schema(
  {
    pincode: {
      type: String,
      required: [true, "Pincode is required"],
      unique: true,
      match: [/^\d{6}$/, "Pincode must be exactly 6 digits"],
    },
    // Optional label so the admin can recognise the area ("Amravati city")
    area: { type: String, default: "", trim: true },
    charge: { type: Number, required: [true, "Delivery charge is required"], min: 0 },
    chargeType: { type: String, enum: ["per_unit", "per_order"], default: "per_order" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeliveryZone", deliveryZoneSchema);
