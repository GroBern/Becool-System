// ════════════════════════════════════════════════════════════════════
//  SEED — create default users & settings on first run
// ════════════════════════════════════════════════════════════════════

const User = require("./models/User");
const Settings = require("./models/Settings");
const Operator = require("./models/Operator");

// Mirror of src/constants/defaults.js
const DEF_USERS = [
  { id: "u1", username: "admin", password: "admin123", pin: "1234", name: "Admin", role: "admin" },
  { id: "u2", username: "cashier", password: "cashier123", pin: "5678", name: "Cashier", role: "cashier" },
];

const DEF_SETTINGS = {
  businessName: "Ama Surf School",
  currencySymbol: "LKR ",
  location: "Weligama, Sri Lanka",
  singlePrices: { beginner: 25, intermediate: 30, advanced: 40 },
  groupPrices: { beginner: 20, intermediate: 25, advanced: 35 },
  surfboardRental: { hourly: 5, daily: 15 },
  sunbedRental: { hourly: 3, daily: 10 },
  packages: [
    { id: "pkg1", name: "Beginner 5-Day", level: "beginner", lessons: 5, duration: 90, price: 100 },
    { id: "pkg2", name: "Intermediate 7-Day", level: "intermediate", lessons: 7, duration: 90, price: 160 },
    { id: "pkg3", name: "Advanced 10-Day", level: "advanced", lessons: 10, duration: 120, price: 350 },
  ],
  commissions: { instructorFixed: 10, instructorPercent: 30, agentPercent: 10 },
  timeSlots: [
    "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM",
  ],
  lessonDurations: { beginner: 90, intermediate: 90, advanced: 120 },
};

async function seed() {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    console.log("[Seed] Creating default users...");
    for (const u of DEF_USERS) {
      await User.create(u); // password hashed by pre-save hook
    }
    console.log("[Seed] Default users created (admin/admin123/pin:1234, cashier/cashier123/pin:5678)");
  }

  const settings = await Settings.findOne({ _singleton: "settings" });
  if (!settings) {
    console.log("[Seed] Creating default settings...");
    await Settings.create({ data: DEF_SETTINGS });
    console.log("[Seed] Default settings created");
  }

  const opCount = await Operator.countDocuments();
  if (opCount === 0) {
    console.log("[Seed] Creating default operators...");
    await Operator.create({ id: "op1", name: "Operator 1", pin: "1111" });
    await Operator.create({ id: "op2", name: "Operator 2", pin: "2222" });
    console.log("[Seed] Default operators created (Operator 1/pin:1111, Operator 2/pin:2222)");
  }
}

module.exports = { seed };
