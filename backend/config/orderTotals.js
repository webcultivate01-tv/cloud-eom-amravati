const { round2 } = require("./company");
const DeliveryZone = require("../models/DeliveryZone");

/**
 * Looks up the admin-set delivery rate for a pincode. Returns null when the
 * pincode has no active rate, in which case the products' own per-unit
 * delivery charges (if any) apply as before.
 */
const findDeliveryZone = async (pincode) => {
  const pin = String(pincode || "").trim();
  if (!/^\d{6}$/.test(pin)) return null;
  return DeliveryZone.findOne({ pincode: pin, isActive: true });
};

/**
 * Price an order from its already-built line items ({ price, quantity,
 * deliveryCharge }). One place decides the money, so COD and online orders
 * can never disagree about what the customer owes.
 *
 * Delivery comes from the pincode rate when the destination has one:
 *   per_unit  → rate × total quantity (3 mugs at ₹40 add ₹120)
 *   per_order → the rate once, whatever the quantity
 * Otherwise each product's own per-unit delivery charge is used.
 */
const computeOrderTotals = (orderItems, zone = null) => {
  const itemsTotal = round2(orderItems.reduce((s, i) => s + i.price * i.quantity, 0));
  const units = orderItems.reduce((s, i) => s + i.quantity, 0);

  let deliveryCharge;
  if (zone) {
    deliveryCharge = round2(zone.chargeType === "per_unit" ? zone.charge * units : zone.charge);
  } else {
    deliveryCharge = round2(orderItems.reduce((s, i) => s + (i.deliveryCharge || 0) * i.quantity, 0));
  }
  return { itemsTotal, deliveryCharge, totalPrice: round2(itemsTotal + deliveryCharge) };
};

module.exports = { computeOrderTotals, findDeliveryZone };
