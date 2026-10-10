const axios = require("axios");
const Order = require("../models/Order");
const { sendShipmentEmail } = require("../config/mailer");
const { hasModule } = require("../middleware/adminMiddleware");

const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";

/* ─────────────────────────────────────────────────────────────
   AUTH — get a fresh JWT token from Shiprocket (valid 24 h)
───────────────────────────────────────────────────────────── */
const getShiprocketToken = async () => {
  const { data } = await axios.post(`${SHIPROCKET_BASE}/auth/login`, {
    email:    process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_PASSWORD,
  });
  if (!data.token) throw new Error("Shiprocket login failed — check SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD in .env");
  return data.token;
};

/* ─────────────────────────────────────────────────────────────
   HELPER — map our payment method to Shiprocket's expected value
   Shiprocket accepts: "COD" or "Prepaid"
───────────────────────────────────────────────────────────── */
const srPaymentMethod = (order) => {
  if (order.paymentMethod === "razorpay" && order.paymentStatus === "paid") return "Prepaid";
  return "COD";
};

/* ─────────────────────────────────────────────────────────────
   @desc   Ship an order via Shiprocket
           Flow:
             1. Auth → get token
             2. Create order on Shiprocket
             3. Assign AWB (auto-select best courier)
             4. Schedule pickup (so delivery boy comes to collect)
             5. Save tracking info to our DB
   @route  POST /api/shipment/:orderId
   @access Admin
───────────────────────────────────────────────────────────── */
const shipOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate("user", "name email phone")
      .populate("items.product", "name sku");

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.cancelledBy === "user") {
      return res.status(400).json({ message: "This order was cancelled by the customer and cannot be shipped." });
    }

    if (order.status === "Cancelled") {
      return res.status(400).json({ message: "Cannot ship a cancelled order." });
    }

    if (order.shipment?.trackingId) {
      return res.status(400).json({
        message: "Order already shipped",
        shipment: order.shipment,
      });
    }

    /* ── Validate that all required customer details are present
          (Shiprocket rejects the request if any of these are missing,
           and the delivery boy needs them to find the address) ─── */
    const addr = order.shippingAddress || {};
    const missing = [];
    if (!addr.fullName?.trim()) missing.push("Full Name");
    if (!addr.phone?.trim())    missing.push("Phone");
    if (!addr.address?.trim())  missing.push("Address");
    if (!addr.city?.trim())     missing.push("City");
    if (!addr.pincode?.trim())  missing.push("Pincode");
    const stateForShipping = (addr.state || req.body.state || "").trim();
    if (!stateForShipping)      missing.push("State");
    if (!order.user?.email)     missing.push("Customer Email");

    if (missing.length) {
      return res.status(400).json({
        message: `Cannot ship — customer details are incomplete: ${missing.join(", ")}. Please update the order before shipping.`,
      });
    }

    /* ── Step 1: Authenticate ─────────────────────── */
    const token  = await getShiprocketToken();
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    /* ── Step 2: Build Shiprocket order payload ─────
          Send the COMPLETE customer record so the courier
          and the delivery boy have everything they need:
          name, phone, alternate phone, full address,
          landmark, email, item details, and any special
          instructions the customer left. ─────────── */
    const orderDate = new Date(order.createdAt).toISOString().split("T")[0];

    // Shiprocket requires a unique order_id per request.
    // We append a timestamp suffix to avoid "duplicate order" errors on retries.
    const srOrderId = `${order._id.toString().slice(-10)}-${Date.now()}`;

    // Combine address line 2 + landmark so the delivery boy sees both.
    const addressLine2Combined = [
      addr.addressLine2?.trim(),
      addr.landmark?.trim() ? `Landmark: ${addr.landmark.trim()}` : "",
    ].filter(Boolean).join(" — ");

    // Customer's account phone may differ from shipping phone — pass as alternate.
    const altPhone = (order.user?.phone && order.user.phone !== addr.phone)
      ? order.user.phone
      : "";

    // Combine customer note + address-type so the delivery boy gets context.
    const deliveryNote = [
      addr.addressType ? `Address Type: ${addr.addressType}` : "",
      order.customerNote?.trim() ? `Note: ${order.customerNote.trim()}` : "",
    ].filter(Boolean).join(" | ");

    const srOrderPayload = {
      order_id:   srOrderId,
      order_date: orderDate,

      // Customer-facing instructions to courier (visible on label / dashboard)
      comment: deliveryNote || `Order #${order._id.toString().slice(-8).toUpperCase()}`,

      // "Primary" must match the pickup location name you set in
      // Shiprocket Dashboard → Settings → Manage Pickup Addresses
      pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",

      // Billing = customer's address (Shiprocket uses this for the shipping label
      // that the delivery boy reads off the package)
      billing_customer_name:  addr.fullName,
      billing_last_name:      "",
      billing_address:        addr.address,
      billing_address_2:      addressLine2Combined,
      billing_city:           addr.city,
      billing_pincode:        addr.pincode,
      billing_state:          stateForShipping,
      billing_country:        "India",
      billing_email:          order.user.email,
      billing_phone:          addr.phone,
      billing_alternate_phone: altPhone,

      // Shipping = same as billing
      shipping_is_billing: true,

      // Order items — pass real product SKU when configured so the picker/packer
      // and the courier label show correct line-item info. Size is appended to
      // the item name so it's visible on the shipping label.
      order_items: order.items.map((item) => ({
        name:          item.size ? `${item.name} (Size: ${item.size})` : item.name,
        sku:           item.product?.sku || item.product?._id?.toString() || `SKU-${Date.now()}`,
        units:         item.quantity,
        selling_price: item.price,
        discount:      0,
        tax:           0,
        hsn:           "",
      })),

      // Payment — CRITICAL: must be "Prepaid" for online-paid orders, "COD" for cash
      payment_method: srPaymentMethod(order),
      sub_total:      order.totalPrice,

      // Package dimensions from admin form (or sensible defaults)
      length:  Number(req.body.length)  || 10,
      breadth: Number(req.body.breadth) || 10,
      height:  Number(req.body.height)  || 5,
      weight:  Number(req.body.weight)  || 0.5,
    };

    /* ── Step 3: Create order on Shiprocket ───────── */
    let srOrder;
    try {
      const { data } = await axios.post(
        `${SHIPROCKET_BASE}/orders/create/adhoc`,
        srOrderPayload,
        { headers }
      );
      srOrder = data;
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors || err.message;
      return res.status(502).json({ message: `Shiprocket order creation failed: ${msg}` });
    }

    const shiprocketOrderId = srOrder.order_id;
    const shipmentId        = srOrder.shipment_id;

    if (!shipmentId) {
      return res.status(502).json({
        message: "Shiprocket did not return a shipment_id. Check your pickup address and product details.",
        srResponse: srOrder,
      });
    }

    /* ── Step 4: Assign AWB (auto-select best courier) ── */
    let trackingId  = "";
    let courierName = "";
    let courierId   = null;

    try {
      const { data: awbData } = await axios.post(
        `${SHIPROCKET_BASE}/courier/assign/awb`,
        { shipment_id: String(shipmentId) },
        { headers }
      );

      trackingId  = awbData.response?.data?.awb_code    || "";
      courierName = awbData.response?.data?.courier_name || "";
      courierId   = awbData.response?.data?.courier_company_id || null;

      if (!trackingId) {
        // AWB assignment failed — common reasons:
        // 1. No courier serviceable to this pincode
        // 2. Pickup address pincode not set in Shiprocket dashboard
        console.warn("AWB assignment returned no awb_code:", JSON.stringify(awbData));
      }
    } catch (err) {
      // Non-fatal — order is created on Shiprocket, AWB can be assigned manually
      console.error("AWB assignment error:", err.response?.data || err.message);
    }

    /* ── Step 5: Schedule Pickup ──────────────────────
       This is the step that tells Shiprocket to send a
       delivery boy to your shop/warehouse to collect the parcel.
       Without this step the courier will NOT come to pick up.
    ─────────────────────────────────────────────────── */
    let pickupScheduled = false;
    if (shipmentId) {
      try {
        const pickupPayload = {
          shipment_id: [String(shipmentId)],
        };
        const { data: pickupData } = await axios.post(
          `${SHIPROCKET_BASE}/courier/generate/pickup`,
          pickupPayload,
          { headers }
        );
        // pickupData.pickup_status === 1 means scheduled successfully
        pickupScheduled = pickupData?.pickup_status === 1 || pickupData?.response?.data?.pickup_status === 1;
        if (!pickupScheduled) {
          console.warn("Pickup scheduling response:", JSON.stringify(pickupData));
        }
      } catch (err) {
        // Non-fatal — admin can schedule pickup manually from Shiprocket dashboard
        console.error("Pickup scheduling error:", err.response?.data || err.message);
      }
    }

    /* ── Step 6: Save to our DB ───────────────────── */
    order.shipment = {
      shiprocketOrderId: shiprocketOrderId?.toString() || srOrderId,
      shipmentId:        shipmentId?.toString(),
      trackingId,
      courierName,
      shippedAt: new Date(),
    };
    order.status = "Shipped";
    await order.save();

    // Step 7: Send shipment tracking email to customer
    try {
      await sendShipmentEmail({
        toEmail:         order.user.email,
        toName:          order.user.name,
        orderId:         order._id.toString(),
        orderNumber:     order.orderNumber,
        items:           order.items,
        totalPrice:      order.totalPrice,
        discount:        order.discount,
        couponCode:      order.coupon?.code,
        trackingId,
        courierName,
        shippingAddress: order.shippingAddress,
      });
    } catch (mailErr) {
      // Non-fatal — shipment is saved even if email fails
      console.error("Shipment email failed:", mailErr.message);
    }

    res.json({
      message: pickupScheduled
        ? "Order shipped & pickup scheduled! Delivery boy will come to collect the parcel."
        : "Order created on Shiprocket. Pickup scheduling may need manual confirmation in Shiprocket dashboard.",
      shipment:        order.shipment,
      pickupScheduled,
      awbAssigned:     !!trackingId,
    });

  } catch (error) {
    const msg =
      error.response?.data?.message ||
      error.response?.data?.errors  ||
      error.message                 ||
      "Shiprocket API error";
    console.error("shipOrder error:", msg);
    res.status(500).json({ message: msg });
  }
};

/* ─────────────────────────────────────────────────────────────
   @desc   Get live tracking info from Shiprocket for an order
   @route  GET /api/shipment/:orderId
   @access Admin or Order Owner
───────────────────────────────────────────────────────────── */
const getShipmentInfo = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .select("shipment status shippingAddress user");
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.user.toString() !== req.user._id.toString() && !hasModule(req.user, "orders")) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // If we have a tracking ID, fetch live status from Shiprocket
    let liveTracking = null;
    if (order.shipment?.trackingId) {
      try {
        const token = await getShiprocketToken();
        const { data } = await axios.get(
          `${SHIPROCKET_BASE}/courier/track/awb/${order.shipment.trackingId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        liveTracking = data?.tracking_data || null;
      } catch (_) {
        // Non-fatal — return stored info if live fetch fails
      }
    }

    res.json({
      shipment:     order.shipment,
      status:       order.status,
      liveTracking,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   @desc   Cancel a shipment on Shiprocket (before pickup)
   @route  POST /api/shipment/:orderId/cancel
   @access Admin
───────────────────────────────────────────────────────────── */
const cancelShipment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (!order.shipment?.shiprocketOrderId) {
      return res.status(400).json({ message: "No Shiprocket shipment found for this order" });
    }

    const token = await getShiprocketToken();
    await axios.post(
      `${SHIPROCKET_BASE}/orders/cancel`,
      { ids: [order.shipment.shiprocketOrderId] },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Reset shipment info so admin can re-ship if needed
    order.shipment = { shiprocketOrderId: "", shipmentId: "", trackingId: "", courierName: "", shippedAt: null };
    order.status = "Processing";
    await order.save();

    res.json({ message: "Shipment cancelled on Shiprocket. Order status reset to Processing." });
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    res.status(500).json({ message: msg });
  }
};

module.exports = { shipOrder, getShipmentInfo, cancelShipment };
