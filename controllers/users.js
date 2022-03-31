const User = require("../models/user");
const Order = require("../models/order");
require("dotenv").config();
const { validationResult } = require("express-validator");
const redisHelper = require("../utils/redisHelper");
const MAX_ORDERS_PER_PAGE = require("../utils/constants").MAX_ORDERS_PER_PAGE;

module.exports.getUsers = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ error: errors });
  try {
    const users = await redisHelper.checkCache("U", async () => {
      return await User.find();
    });
    res.json({ data: users });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: { msg: "Server error" } });
  }
};

module.exports.getUser = async (req, res) => {
  const id = req.user.id;
  try {
    const user = await redisHelper.checkCache(`U:${id}`, async () => {
      return await User.findById(id);
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    const userdata = {
      token: user.token,
      id: user._id,
      username: user.username,
      email: user.email,
      contact: user.contact,
      points: user.points,
      paymentMethod: user.paymentMethod,
      address: user.address,
    };
    res.json({ data: userdata });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: { msg: "Server error" } });
  }
};

module.exports.createdOrders = async (req, res) => {
  const id = req.user.id;
  let page = req.query.page;
  if (!page || page < 1) page = 1;

  try {
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
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: { msg: "Server error" } });
  }
};

module.exports.acceptedOrders = async (req, res) => {
  const id = req.user.id;
  let page = req.query.page;
  if (!page || page < 1) page = 1;

  try {
    const data = await redisHelper.checkCache(`U:${id}:A`, async () => {
      const totalOrders = await Order.countDocuments({ acceptedBy: id });
      const orders = await Order.find({ acceptedBy: id }).populate(
        "generatedBy",
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
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: { msg: "Server error" } });
  }
};

module.exports.updateUser = async (req, res) => {
  const userid = req.user.id;
  const body = req.body;

  try {
    let user = await User.findById(userid);
    if ("contact" in body) user.contact.push(body.contact);
    if ("address" in body) {
      if (!body.address?.address || body.address.address.trim().length === 0)
        return res.status(422).json({
          error: { msg: "Invalid address." },
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
          error: { msg: "Invalid payment method" },
        });
      user.paymentMethod.push(body.paymentMethod);
    }

    await redisHelper.setCache(`U:${userid}`, user);
    await redisHelper.deleteCache("U");
    await user.save();

    const userdata = {
      token: user.token,
      id: user._id,
      username: user.username,
      email: user.email,
      contact: user.contact,
      points: user.points,
      paymentMethod: user.paymentMethod,
      address: user.address,
    };
    res.json({ data: userdata });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: { msg: "Server error" } });
  }
};

module.exports.activity = async (req, res) => {
  const id = req.user.id;
  let page = req.query.page;
  if (!page || page < 1) page = 1;

  try {
    const data = await redisHelper.checkCache(`U:${id}:H`, async () => {
      let orders = await Order.find({ generatedBy: id }).populate(
        "acceptedBy",
        {
          username: 1,
          contact: 1,
        }
      );
      orders.push(
        ...(await Order.find({ acceptedBy: id }).populate("generatedBy", {
          username: 1,
          contact: 1,
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
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: { msg: "Server error" } });
  }
};

module.exports.lastAcceptedOrder = async (req, res) => {
  const id = req.user.id;
  try {
    const data = await Order.find({ acceptedBy: id, state: "accepted" })
      .sort({ updatedAt: -1 })
      .limit(1)
      .populate("generatedBy", {
        username: 1,
        contact: 1,
      });
    res.json({ data });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: { msg: "Server error" } });
  }
};
