const DeliveryZone = require("../models/DeliveryZone");
const { findDeliveryZone } = require("../config/orderTotals");

const FIELDS = ["pincode", "area", "charge", "chargeType", "isActive"];
const pick = (body) =>
  FIELDS.reduce((acc, f) => (body[f] !== undefined ? { ...acc, [f]: body[f] } : acc), {});

const failure = (res, error) =>
  error.code === 11000
    ? res.status(400).json({ message: "That pincode already has a delivery rate — edit it instead" })
    : res.status(400).json({ message: error.message });

// @desc    Delivery rate for a pincode, used by checkout to show the charge
// @route   GET /api/delivery/quote?pincode=444601
// @access  Public
const getQuote = async (req, res) => {
  try {
    const zone = await findDeliveryZone(req.query.pincode);
    if (!zone) return res.json({ found: false });
    res.json({ found: true, charge: zone.charge, chargeType: zone.chargeType, area: zone.area });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/delivery
// @access  Admin
const getZones = async (req, res) => {
  try {
    res.json(await DeliveryZone.find().sort({ pincode: 1 }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/delivery
// @access  Admin
const createZone = async (req, res) => {
  try {
    res.status(201).json(await DeliveryZone.create(pick(req.body)));
  } catch (error) {
    failure(res, error);
  }
};

// @route   PUT /api/delivery/:id
// @access  Admin
const updateZone = async (req, res) => {
  try {
    const zone = await DeliveryZone.findByIdAndUpdate(req.params.id, pick(req.body), {
      new: true,
      runValidators: true,
    });
    if (!zone) return res.status(404).json({ message: "Delivery rate not found" });
    res.json(zone);
  } catch (error) {
    failure(res, error);
  }
};

// @route   DELETE /api/delivery/:id
// @access  Admin
const deleteZone = async (req, res) => {
  try {
    const zone = await DeliveryZone.findByIdAndDelete(req.params.id);
    if (!zone) return res.status(404).json({ message: "Delivery rate not found" });
    res.json({ message: "Delivery rate deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getQuote, getZones, createZone, updateZone, deleteZone };
