const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { geocode } = require("../utils/geoCoder");

const OrderSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    items: [
      {
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        unit: {
          type: String,
        },
      },
    ],
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    state: {
      type: String,
      default: "active",
    },
    acceptedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    points: {
      type: Number,
    },
    address: {
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
      },
    },
    paymentMethod: {
      paymentType: {
        type: String,
      },
      paymentId: {
        type: String,
      },
    },
    contact: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

OrderSchema.pre("save", async function (next) {
  const loc = await geocode(this.address.address);
  this.address.location = {
    type: "Point",
    coordinates: [loc[0].lon, loc[0].lat],
  };
  next();
});

module.exports = mongoose.model("Order", OrderSchema);
