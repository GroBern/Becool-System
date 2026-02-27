const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    _singleton: { type: String, default: "settings", unique: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true, minimize: false }
);

module.exports = mongoose.model("Settings", settingsSchema);
