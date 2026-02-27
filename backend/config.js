// ════════════════════════════════════════════════════════════════════
//  SERVER CONFIG — loads .env and exports configuration
// ════════════════════════════════════════════════════════════════════

require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/becool",
  JWT_SECRET: process.env.JWT_SECRET || "becool-surf-school-secret-change-in-production",
  JWT_EXPIRES: "7d",
  NODE_ENV: process.env.NODE_ENV || "development",
};
