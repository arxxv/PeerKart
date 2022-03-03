const Order = require("../models/order");
const User = require("../models/user");
const { genError } = require("../utils/validError");
const { validationResult } = require("express-validator");

const MAX_ORDERS_PER_PAGE = require("../utils/constants").MAX_ORDERS_PER_PAGE;

module.exports.getOrders = async (req, res) => {
  let page = req.query.page;
  if (!page) page = 1;
  const totalOrders = await Order.countDocuments();
  const orders = await Order.find({ state: "active" })
    .skip((page - 1) * MAX_ORDERS_PER_PAGE)
    .limit(MAX_ORDERS_PER_PAGE)
    .populate("generatedBy", { username: 1 })
    .populate("acceptedBy", { username: 1, contact: 1 })
    .populate("address")
    .populate("paymentMethod");
  res.json({
    data: orders,
    totalPages: Math.ceil(totalOrders / MAX_ORDERS_PER_PAGE),
    noOfOrders: orders.length,
  });
};

module.exports.getOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ error: errors });

  const id = req.params.id;
  // get order
  let order;
  try {
    order = await Order.findById(id).populate("acceptedBy", {
      username: 1,
      contact: 1,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server error" });
  }

  // order doesn't exists
  if (!order)
    return res.status(404).json({
      error: {
        errors: [genError(id, "Order doesn't exist.", "id", "body")],
      },
    });

  res.json({ data: order });
};

module.exports.addOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ error: errors });

  const name = req.body.name;
  const items = req.body.items;
  const category = req.body.category;
  const generatedBy = req.user.id;
  const address = req.body.address;
  const paymentMethod = req.body.paymentMethod;
  const contact = req.body.contact;
  const points = items.length * 5; //FIXME: points

  let saved;
  try {
    const newOrder = new Order({
      name,
      category,
      items,
      generatedBy,
      points,
      address,
      paymentMethod,
      contact,
    });
    saved = await newOrder.save();
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server error" });
  }

  res.status(201).json({ data: saved });
};

module.exports.acceptOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ error: errors });

  const orderid = req.params.id;
  const userid = req.user.id;
  let order, user;

  try {
    order = await Order.findById(orderid);
    if (!order)
      return res.status(404).json({
        error: {
          errors: [genError(orderid, "Order doesn't exist.", "id", "param")],
        },
      });
    if (order.state !== "active")
      return res.status(403).json({
        error: {
          errors: [
            genError(orderid, "Order isn't in active state.", "id", "param"),
          ],
        },
      });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server error" });
  }

  try {
    user = await User.findById(userid);
    if (
      user.address.length === 0 ||
      user.paymentMethod.length === 0 ||
      user.contact.length === 0
    )
      return res.status(403).json({
        error: {
          errors: [
            genError(userid, "Complete your details first.", "id", "param"),
          ],
        },
      });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server error" });
  }

  order.acceptedBy = userid;
  order.state = "accepted";
  try {
    await order.save();
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server error" });
  }

  res.json({ data: order });
};

module.exports.rejectOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ error: errors });

  const orderid = req.params.id;
  const userid = req.user.id;
  let order;

  try {
    order = await Order.findById(orderid);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server error" });
  }
  if (!order)
    return res.status(404).json({
      error: {
        errors: [genError(orderid, "Order doesn't exist.", "id", "param")],
      },
    });

  // Check user
  try {
    user = await User.findById(userid);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server error" });
  }

  if (order.state !== "accepted" || String(order.acceptedBy) !== userid)
    return res.status(403).json({
      error: {
        errors: [
          genError(orderid, "You cannot reject this order.", "id", "param"),
        ],
      },
    });

  order.acceptedBy = null;
  order.state = "active";
  try {
    await order.save();
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server error" });
  }

  res.json({ data: order });
};

module.exports.deleteOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ error: errors });

  const orderid = req.params.id;
  const userid = req.user.id;
  let order, user;

  try {
    order = await Order.findById(orderid);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server error" });
  }
  if (!order)
    return res.status(404).json({
      error: {
        errors: [genError(orderid, "Order doesn't exist.", "id", "param")],
      },
    });

  if (order.state !== "active" || String(order.generatedBy) !== userid)
    return res.status(403).json({
      error: {
        errors: [
          genError(orderid, "You cannot delete this order.", "id", "param"),
        ],
      },
    });

  try {
    await Order.findByIdAndDelete(orderid);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server error" });
  }

  res.json({ data: order });
};

module.exports.modifyOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ error: errors });

  const orderid = req.params.id;
  const userid = req.user.id;
  let order;

  try {
    order = await Order.findById(orderid);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server error" });
  }
  if (!order)
    return res.status(404).json({
      error: {
        errors: [genError(orderid, "Order doesn't exist.", "id", "param")],
      },
    });

  if (order.state !== "active" || String(order.generatedBy) !== userid)
    return res.status(403).json({
      error: {
        errors: [
          genError(orderid, "You cannot modify this order.", "id", "param"),
        ],
      },
    });

  order.name = req.body.name;
  order.items = req.body.items;
  order.category = req.body.category;
  order.paymentMethod = req.body.paymentMethod;
  order.address = req.body.address;
  order.contact = req.body.contact;

  try {
    await order.save();
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server error" });
  }

  res.json({ data: order });
};
