const User = require("../models/user");
const Order = require("../models/order");
require("dotenv").config();
const { validationResult } = require("express-validator");

module.exports.getUsers = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors });
  }
  const users = await User.find();
  res.json({ data: users });
};

module.exports.getUser = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ data: user });
};

module.exports.createdOrders = async (req, res) => {
  const id = req.user.id;
  const orders = await Order.find({ generatedBy: id }).populate("acceptedBy", {
    username: 1,
    contact: 1,
  });

  res.json({ data: orders });
};

module.exports.acceptedOrders = async (req, res) => {
  const id = req.user.id;
  const orders = await Order.find({ acceptedBy: id }).populate("generatedBy", {
    username: 1,
  });
  res.json({ data: orders });
};

module.exports.updateUser = async (req, res) => {
  const userid = req.user.id;
  const body = req.body;

  let user = await User.findById(userid);

  if ("contact" in body) user.contact.push(body.contact);
  if ("address" in body) {
    if (!body.address?.address || body.address.address.trim().length === 0)
      return res.status(403).json({
        error: {
          errors: [genError(orderid, "Order doesn't exist.", "id", "param")],
        },
      });
    user.address.push(body.address);
  }
  if ("paymentMethod" in body) {
    if (
      !("paymentType" in body.paymentMethod) ||
      !("paymentId" in body.paymentMethod) ||
      body.paymentMethod.paymentId.trim().length === 0 ||
      body.paymentMethod.paymentType.trim().length === 0
    )
      return res.status(403).json({
        error: {
          errors: [genError(orderid, "Order doesn't exist.", "id", "param")],
        },
      });
    user.paymentMethod.push(body.paymentMethod);
  }

  try {
    await user.save();
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server error" });
  }
  res.json({ data: user });
};

module.exports.activity = async (req, res) => {
  const id = req.user.id;
  let orders = await Order.find({ generatedBy: id }).populate("acceptedBy", {
    username: 1,
    contact: 1,
  });

  orders.push(
    ...(await Order.find({ acceptedBy: id }).populate("generatedBy", {
      username: 1,
    }))
  );

  orders = orders.sort((a, b) => {
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
  res.json({ data: orders });
};
