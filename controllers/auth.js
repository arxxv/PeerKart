const jwt = require("jsonwebtoken");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
require("dotenv").config();

const { genError } = require("../utils/validError");

module.exports.authMiddleware = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];
  if (token == null)
    return res
      .status(401)
      .json({ error: { errors: [{ msg: "Unauthorized" }] } });
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err)
      return res
        .status(403)
        .json({ error: { errors: [{ msg: "Unauthorized" }] } });
    req.user = user;
    next();
  });
};

module.exports.login = async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors });
  }

  let user = await User.findOne({ email: email });
  const check = await bcrypt.compare(password, user.password);
  if (!check) {
    return res.status(404).json({
      error: {
        errors: [
          genError(
            "username/password",
            "Invalid username or password",
            "username/password",
            "body"
          ),
        ],
      },
    });
  }

  user = { id: user._id };
  const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
  res.status(200).json({ token: accessToken });
};

module.exports.signup = async (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  let user = new User({
    username: username,
    email: email,
    password: hashedPassword,
  });
  const saved = await user.save();
  res.status(201).json({ data: "success" });
};
