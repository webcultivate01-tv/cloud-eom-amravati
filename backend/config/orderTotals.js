const { round2 } = require("./company");

/**
 * Price an order from its already-built line items ({ price, quantity,
 * deliveryCharge }). One place decides the money, so COD and online orders
 * can never disagree about what the customer owes.
 *
 * Delivery is charged per unit: 3 mugs at ₹40 delivery each add ₹120.
 */
const computeOrderTotals = (orderItems) => {
  const itemsTotal = round2(orderItems.reduce((s, i) => s + i.price * i.quantity, 0));
  const deliveryCharge = round2(orderItems.reduce((s, i) => s + (i.deliveryCharge || 0) * i.quantity, 0));
  return { itemsTotal, deliveryCharge, totalPrice: round2(itemsTotal + deliveryCharge) };
};

module.exports = { computeOrderTotals };
