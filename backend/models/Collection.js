const mongoose = require("mongoose");

const collectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    items: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true, minimize: false }
);

module.exports = mongoose.model("Collection", collectionSchema);
