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
      address: { type: String, required: true },
      location: {
        type: {
          type: String,
          enum: ["Point"],
        },
        coordinates: {
          type: [Number],
          index: "2dsphere",
        },
        formattedAddress: String,
      },
    },
  ],
  points: { type: Number, default: 100 },
});

module.exports = mongoose.model("User", UserSchema);
