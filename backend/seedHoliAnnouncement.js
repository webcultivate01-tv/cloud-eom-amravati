// One-off: creates the Holi T-shirt announcement shown in the website's event popup.
// Usage: node seedHoliAnnouncement.js
require("dotenv").config();
const mongoose = require("mongoose");
const Event = require("./models/Event");
const User = require("./models/User");

const TITLE = "Holi Special: Custom T-Shirts at just ₹199!";

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    if (await Event.findOne({ title: TITLE })) {
      console.log("Holi announcement already exists - nothing to do.");
      return;
    }

    const admin = await User.findOne({ role: "admin" }).select("_id");

    const event = await Event.create({
      title: TITLE,
      description:
        "Celebrate the festival of colours in style! Get your Holi T-shirt printed with your own design, name or group logo for only ₹199. Limited-time festive offer - order now and be ready before Holi!",
      badge: "Holi Offer",
      link: "/products",
      isActive: true,
      // Holi 2027 is on 22 March - keep the offer live until the end of that day (IST)
      expiresAt: new Date("2027-03-22T23:59:59+05:30"),
      createdBy: admin?._id,
    });

    console.log("Created announcement:", event._id.toString());
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
