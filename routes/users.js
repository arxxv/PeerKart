const express = require("express");
const router = express.Router();
const { header } = require("express-validator");
const authController = require("../controllers/auth");
const userController = require("../controllers/users");

router.get(
  "/",
  [
    header("Password").custom((value) => {
      if (value !== "admin") throw new Error("Not authorized");
      return true;
    }),
  ],
  userController.getUsers
);

router.get("/details", authController.authMiddleware, userController.getUser);

router.put("/update", authController.authMiddleware, userController.updateUser);

router.get(
  "/orders/created",
  authController.authMiddleware,
  userController.createdOrders
);

router.get(
  "/orders/accepted",
  authController.authMiddleware,
  userController.acceptedOrders
);

router.get(
  "/orders/latestaccepted",
  authController.authMiddleware,
  userController.lastAcceptedOrder
);

router.get("/activity", authController.authMiddleware, userController.activity);

module.exports = router;
