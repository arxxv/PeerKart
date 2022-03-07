const Order = require("../models/order");
const User = require("../models/user");
const { genError } = require("../utils/validError");
const { validationResult } = require("express-validator");
const redisHelper = require("../utils/redisHelper");
const MAX_ORDERS_PER_PAGE = require("../utils/constants").MAX_ORDERS_PER_PAGE;

module.exports.getOrders = async (req, res) => {
  let page = req.query.page;
  const filters = req.body.filters;
  if (!page || page < 1) page = 1;
  try {
    const data = await redisHelper.checkCache("O", async () => {
      const totalOrders = await Order.countDocuments();
      const orders = await Order.find({ state: "active", ...filters })
        .populate("generatedBy", { username: 1 })
        .populate("acceptedBy", { username: 1, contact: 1 })
        .populate("address")
        .populate("paymentMethod");
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
    res.status(500).json({ error: "Server errgor" });
  }
};

module.exports.getOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ error: errors });
  const id = req.params.id;

  try {
    let order = await redisHelper.checkCache(`O:${id}`, async () => {
      orderDetails = await Order.findById(id).populate("acceptedBy", {
        username: 1,
        contact: 1,
      });
      return orderDetails;
    });

    // order doesn't exists
    if (!order)
      return res.status(404).json({
        error: {
          errors: [genError(id, "Order doesn't exist.", "id", "body")],
        },
      });

    res.json({ data: order });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server errgor" });
  }
};

module.exports.addOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ error: errors });
  const userid = req.user.id;
  const name = req.body.name;
  const items = req.body.items;
  const category = req.body.category;
  const generatedBy = userid;
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
    await redisHelper.setCache(`O:${saved._id}`, newOrder);
    await redisHelper.deleteCache("O");
    await redisHelper.deleteCache(`U:${userid}:H`);
    await redisHelper.deleteCache(`U:${userid}:C`);
    res.status(201).json({ data: saved });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server errgor" });
  }
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
    await redisHelper.deleteCache("O");
    await redisHelper.deleteCache(`U:${userid}:H`);
    await redisHelper.deleteCache(`U:${userid}:A`);
    await redisHelper.setCache(`O:${orderid}`, order);
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
    if (!order)
      return res.status(404).json({
        error: {
          errors: [genError(orderid, "Order doesn't exist.", "id", "param")],
        },
      });
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

    await order.save();
    await redisHelper.setCache(`O:${orderid}`, order);
    await redisHelper.deleteCache("O");
    await redisHelper.deleteCache(`U:${userid}:H`);
    await redisHelper.deleteCache(`U:${userid}:A`);
    res.json({ data: order });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports.deleteOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ error: errors });

  const orderid = req.params.id;
  const userid = req.user.id;
  let order;

  try {
    order = await Order.findById(orderid);
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
    await Order.findByIdAndDelete(orderid);
    await redisHelper.deleteCache("O");
    await redisHelper.deleteCache(`U:${userid}:H`);
    await redisHelper.deleteCache(`O:${orderid}`);
    await redisHelper.deleteCache(`U:${userid}:C`);
    res.json({ data: order });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.modifyOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ error: errors });

  const orderid = req.params.id;
  const userid = req.user.id;
  let order;

  try {
    order = await Order.findById(orderid);
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
    await order.save();
    await redisHelper.deleteCache("O");
    await redisHelper.deleteCache(`U:${userid}:H`);
    await redisHelper.deleteCache(`U:${userid}:C`);
    await redisHelper.setCache(`O:${orderid}`);
    res.json({ data: order });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server error" });
  }
};
