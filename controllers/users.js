const User = require("../models/user");
const Order = require("../models/order");
require("dotenv").config();
const { validationResult } = require("express-validator");
const { genError } = require("../utils/validError");

const MAX_ORDERS_PER_PAGE = require("../utils/constants").MAX_ORDERS_PER_PAGE;

module.exports.getUsers = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ error: errors });
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
  let page = req.query.page;
  if (!page || page < 1) page = 1;
  const data = await redisHelper.checkCache(`U:${id}:C`, async () => {
    const totalOrders = await Order.countDocuments({ generatedBy: id });
    const orders = await Order.find({ generatedBy: id }).populate(
      "acceptedBy",
      {
        username: 1,
        contact: 1,
      }
    );

    const totalPages = Math.ceil(totalOrders / MAX_ORDERS_PER_PAGE);
    return {
      data: orders,
      totalPages,
    };
  });
  if (page > data.totalPages) page = data.totalPages;
  const skip = (page - 1) * MAX_ORDERS_PER_PAGE;

  data.data = data.data.slice(
    skip,
    Math.min(skip + MAX_ORDERS_PER_PAGE, data.data.length)
  );
  data.noOfOrders = data.data.length;

  res.json(data);
};

module.exports.acceptedOrders = async (req, res) => {
  const id = req.user.id;
  let page = req.query.page;
  if (!page || page < 1) page = 1;

  const data = await redisHelper.checkCache(`U:${id}:A`, async () => {
    const totalOrders = await Order.countDocuments({ acceptedBy: id });
    const orders = await Order.find({ acceptedBy: id }).populate(
      "generatedBy",
      {
        username: 1,
      }
    );
    const totalPages = Math.ceil(totalOrders / MAX_ORDERS_PER_PAGE);
    return {
      data: orders,
      totalPages,
    };
  });
  if (page > data.totalPages) page = data.totalPages;
  const skip = (page - 1) * MAX_ORDERS_PER_PAGE;

  data.data = data.data.slice(
    skip,
    Math.min(skip + MAX_ORDERS_PER_PAGE, data.data.length)
  );
  data.noOfOrders = data.data.length;

  res.json(data);

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
  let page = req.query.page;
  if (!page) page = 1;
  let orders = await Order.find({ generatedBy: id }).populate("acceptedBy", {
    username: 1,
    contact: 1,
  });
  orders.push(
    ...(await Order.find({ acceptedBy: id }).populate("generatedBy", {
      username: 1,
      contact: 1,
    })));
    orders.push(
      ...(await Order.find({ acceptedBy: id }).populate("generatedBy", {
        username: 1,
      }))
    );
    orders = orders.sort((a, b) => {
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
    const totalOrders = orders.length;
    const totalPages = Math.ceil(totalOrders / MAX_ORDERS_PER_PAGE);
    return {
      data: orders,
      totalPages,
    };
  });
  if (page > data.totalPages) page = data.totalPages;
  const skip = (page - 1) * MAX_ORDERS_PER_PAGE;

  data.data = data.data.slice(
    skip,
    Math.min(skip + MAX_ORDERS_PER_PAGE, data.data.length)
  );
  data.noOfOrders = data.data.length;

  res.json(data);

};
