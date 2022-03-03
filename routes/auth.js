const express = require("express");
const User = require("../models/user");
const authController = require("../controllers/auth");
const { body } = require("express-validator");

const router = express.Router();

router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please enter a valid email address.")
      .custom((value) => {
        return User.findOne({ email: value }).then((user) => {
          if (!user) return Promise.reject("Invalid username or password");
        });
      }),
    body("password", "Please enter a valid password")
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
  ],
  authController.login
);

router.post(
  "/signup",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please enter a valid email address.")
      .custom((value) => {
        return User.findOne({ email: value }).then((user) => {
          if (user)
            return Promise.reject(
              "Email already in use. Please pick a different one or login instead."
            );
        });
      }),
    body("username")
      .isLength({ min: 5 })
      .withMessage("Username should be atleast 5 character long")
      .trim()
      .custom((value, { req }) => {
        return User.findOne({ username: value }).then((user) => {
          if (user) {
            return Promise.reject(
              "Username already in use. Please pick a different one or login instead."
            );
          }
        });
      }),
    body(
      "password",
      "Please enter a password with only numbers and text and at least 5 characters."
    )
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
    body("confirmPassword")
      .trim()
      .custom((value, { req }) => {
        if (value !== req.body.password)
          throw new Error("Passwords have to match.");
        return true;
      }),
  ],
  authController.signup
);

module.exports = router;
