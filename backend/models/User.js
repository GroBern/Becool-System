const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    pin: { type: String, default: "" },
    name: { type: String, required: true },
    role: { type: String, enum: ["admin", "cashier"], required: true },
  },
  { timestamps: true }
);

// Hash password and pin before save (only when modified)
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  if (this.isModified("pin") && this.pin) {
    this.pin = await bcrypt.hash(this.pin, 10);
  }
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.comparePin = function (candidate) {
  if (!this.pin) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.pin);
};

// Return plain object matching frontend shape (no password/pin hash)
userSchema.methods.toClient = function () {
  return { id: this.id, username: this.username, name: this.name, role: this.role, hasPin: !!this.pin };
};

module.exports = mongoose.model("User", userSchema);
