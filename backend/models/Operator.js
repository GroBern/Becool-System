const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const operatorSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    pin: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash pin before save (only when modified)
operatorSchema.pre("save", async function (next) {
  if (this.isModified("pin")) {
    this.pin = await bcrypt.hash(this.pin, 10);
  }
  next();
});

operatorSchema.methods.comparePin = function (candidate) {
  return bcrypt.compare(candidate, this.pin);
};

operatorSchema.methods.toClient = function () {
  return { id: this.id, name: this.name, active: this.active };
};

module.exports = mongoose.model("Operator", operatorSchema);
