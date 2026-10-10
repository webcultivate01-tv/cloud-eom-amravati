const { round2 } = require("./company");
const DeliveryZone = require("../models/DeliveryZone");
const Product = require("../models/Product");

/** A problem with what the customer sent (bad product, size...), carrying the HTTP status to answer with. */
class OrderInputError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Turn the cart the customer sent ({ product, quantity, size, uploadedImage })
 * into order lines priced from the database, never from the browser. Throws an
 * OrderInputError for an unknown or unavailable product or a bad size.
 */
const buildOrderItems = async (items) => {
  const orderItems = [];
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) throw new OrderInputError(404, `Product ${item.product} not found`);
    if (!product.isAvailable) throw new OrderInputError(400, `${product.name} is unavailable`);

    // Size validation — if product offers sizes, customer must pick one
    if (product.sizes?.length > 0) {
      if (!item.size) throw new OrderInputError(400, `Please select a size for "${product.name}"`);
      if (!product.sizes.includes(item.size)) {
        throw new OrderInputError(400, `Invalid size "${item.size}" for "${product.name}"`);
      }
    }

    orderItems.push({
      product: product._id,
      name: product.name,
      price: product.price,
      deliveryCharge: product.deliveryCharge || 0,
      quantity: item.quantity,
      size: item.size || "",
      uploadedImage: item.uploadedImage || "",
    });
  }
  return orderItems;
};

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
 *
 * A coupon `discount` comes off the product cost only — never the delivery
 * charge — and can't take more than the product cost:
 *   totalPrice = itemsTotal − discount + deliveryCharge
 */
const computeOrderTotals = (orderItems, zone = null, discount = 0) => {
  const itemsTotal = round2(orderItems.reduce((s, i) => s + i.price * i.quantity, 0));
  const units = orderItems.reduce((s, i) => s + i.quantity, 0);

  let deliveryCharge;
  if (zone) {
    deliveryCharge = round2(zone.chargeType === "per_unit" ? zone.charge * units : zone.charge);
  } else {
    deliveryCharge = round2(orderItems.reduce((s, i) => s + (i.deliveryCharge || 0) * i.quantity, 0));
  }
  const appliedDiscount = round2(Math.min(Math.max(Number(discount) || 0, 0), itemsTotal));
  return {
    itemsTotal,
    discount: appliedDiscount,
    deliveryCharge,
    totalPrice: round2(itemsTotal - appliedDiscount + deliveryCharge),
  };
};

module.exports = { computeOrderTotals, findDeliveryZone, buildOrderItems, OrderInputError };
