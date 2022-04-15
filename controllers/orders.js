const Order = require("../models/order");
const User = require("../models/user");
const { validationResult } = require("express-validator");
const redisHelper = require("../utils/redisHelper");
const MAX_ORDERS_PER_PAGE = require("../utils/constants").MAX_ORDERS_PER_PAGE;
const geocoder = require("../utils/geoCoder");

module.exports.getOrders = async (req, res) => {
  const coordinates = req.body.coordinates;
  let page = req.query.page;
  const filters = req.body.filters;
  console.log(req.body);

  if (coordinates) {
    let maxRadius = 5000;
    if (req.body.maxRadius) maxRadius = req.body.maxRadius;
    try {
      let orders = await Order.find({
        state: "active",
        "address.location": {
          $near: {
            $geometry: { type: "Point", coordinates: coordinates },
            $maxDistance: maxRadius,
          },
        },
        ...filters,
      });
      if (!page || page < 1) page = 1;
      const totalOrders = orders.length;
      const totalPages = Math.ceil(totalOrders / MAX_ORDERS_PER_PAGE);
      if (page > totalPages) page = totalPages;

      const skip = (page - 1) * MAX_ORDERS_PER_PAGE;
      orders = orders.slice(
        skip,
        Math.min(skip + MAX_ORDERS_PER_PAGE, orders.length)
      );
      return res.json({ data: orders, totalPages, noOfOrders: orders.length });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: { msg: "Server error" } });
    }
  } else {
    if (!page || page < 1) page = 1;
    try {
      const data = await redisHelper.checkCache("O", async () => {
        const orders = await Order.find({ state: "active", ...filters })
          .populate("generatedBy", { username: 1 })
          .populate("acceptedBy", { username: 1, contact: 1 })
          .populate("address")
          .populate("paymentMethod")
          .sort({ updatedAt: -1 });
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
  }
};

module.exports.getOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({ error: errors.array()[0] });
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
        error: { msg: "Order doesn't exist." },
      });

    res.json({ data: order });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: { msg: "Server error" } });
  }
};

module.exports.addOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({ error: errors.array()[0] });

  const userid = req.user.id;
  const name = req.body.name;
  const items = req.body.items;
  const category = req.body.category;
  const generatedBy = userid;
  const address = req.body.address;
  const paymentMethod = req.body.paymentMethod;
  const contact = req.body.contact;
  const points = items.length * 5;

  let saved;
  try {
    let loc;
    if (!req.body.address?.location?.coordinates) {
      loc = await geocoder.geocode(address);
    }
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
    if (!req.body.address?.location?.coordinates) {
      newOrder.address.location = {
        type: "Point",
        coordinates: [loc[0].longitude, loc[0].latitude],
      };
    }
    saved = await newOrder.save();
    await redisHelper.setCache(`O:${saved._id}`, newOrder);
    await redisHelper.deleteCache("O");
    await redisHelper.deleteCache(`U:${userid}:H`);
    await redisHelper.deleteCache(`U:${userid}:C`);
    res.status(201).json({ data: saved });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: { msg: "Server error" } });
  }
};

module.exports.acceptOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({ error: errors.array()[0] });

  const orderid = req.params.id;
  const userid = req.user.id;
  let order, user;

  try {
    order = await Order.findById(orderid);
    if (!order) {
      return res.status(404).json({
        error: { msg: "Order doesn't exist." },
      });
    }
    if (order.state !== "active")
      return res
        .status(403)
        .json({ error: { msg: "Order isn't in active state." } });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: { msg: "Server error" } });
  }
  console.log(String(order.generatedBy), userid);

  if (String(order.generatedBy) === userid) {
    return res
      .status(403)
      .json({ error: { msg: "You cannot accept this order" } });
  }

  try {
    user = await User.findById(userid);
    if (
      user.address.length === 0 ||
      user.paymentMethod.length === 0 ||
      user.contact.length === 0
    )
      return res.status(403).json({
        error: { msg: "Complete your details first." },
      });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: { msg: "Server error" } });
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
    return res.status(500).json({ error: { msg: "Server error" } });
  }

  res.json({ data: order });
};

module.exports.rejectOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({ error: errors.array()[0] });

  const orderid = req.params.id;
  const userid = req.user.id;
  let order;

  try {
    order = await Order.findById(orderid);
    if (!order)
      return res.status(404).json({
        error: { msg: "Order doesn't exist." },
      });
    if (order.state !== "accepted" || String(order.acceptedBy) !== userid)
      return res.status(403).json({
        error: { msg: "You cannot reject this order." },
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
    return res.status(500).json({ error: { msg: "Server error" } });
  }
};

module.exports.deleteOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({ error: errors.array()[0] });

  const orderid = req.params.id;
  const userid = req.user.id;
  let order;

  try {
    order = await Order.findById(orderid);
    if (!order)
      return res.status(404).json({
        error: { msg: "Order doesn't exist." },
      });

    if (order.state !== "active" || String(order.generatedBy) !== userid)
      return res.status(403).json({
        error: { msg: "You cannot delete this order." },
      });
    await Order.findByIdAndDelete(orderid);
    await redisHelper.deleteCache("O");
    await redisHelper.deleteCache(`U:${userid}:H`);
    await redisHelper.deleteCache(`O:${orderid}`);
    await redisHelper.deleteCache(`U:${userid}:C`);
    res.json({ data: order });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: { msg: "Server error" } });
  }
};

module.exports.modifyOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({ error: errors.array()[0] });

  const orderid = req.params.id;
  const userid = req.user.id;
  let order;

  try {
    order = await Order.findById(orderid);
    if (!order)
      return res.status(404).json({
        error: { msg: "Order doesn't exist." },
      });

    if (order.state !== "active" || String(order.generatedBy) !== userid)
      return res.status(403).json({
        error: { msg: "You cannot modify this order." },
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
    return res.status(500).json({ error: { msg: "Server error" } });
  }
};

module.exports.completeOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({ error: errors.array()[0] });

  const orderid = req.params.id;
  const userid = req.user.id;
  let order;

  try {
    order = await Order.findById(orderid);
    if (!order)
      return res.status(404).json({
        error: { msg: "Order doesn't exist." },
      });
    if (order.state !== "accepted") {
      return res.status(403).json({
        error: { msg: "Order isn't in accepted state." },
      });
    }
    if (String(order.acceptedBy) !== userid) {
      return res.status(403).json({
        error: { msg: "Forbidden" },
      });
    }

    order.state = "complete";

    User.findByIdAndUpdate(
      order.acceptedBy,
      {
        $inc: { points: order.points },
      },
      (err) => {
        if (err) console.log(err);
      }
    );

    User.findByIdAndUpdate(
      userid,
      {
        $inc: { points: -order.points },
      },
      (err) => {
        if (err) console.log(err);
      }
    );

    await order.save();
    await redisHelper.setCache(`O:${orderid}`, order);
    await redisHelper.deleteCache(`U:${userid}:H`);
    await redisHelper.deleteCache(`U:${userid}:A`);
    res.json({ data: order });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: { msg: "Server error" } });
  }
};
