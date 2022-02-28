const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const UserSchema = new Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  contact: [{ type: String }],
  paymentMethod: [
    { paymentType: { type: String }, paymentId: { type: String } },
  ],
  address: [
    {
      address: { type: String },
    },
  ],
  points: { type: Number, default: 0 },
});

module.exports = mongoose.model("User", UserSchema);
