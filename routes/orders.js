const express = require("express");
const router = express.Router();
const { param, body, check } = require("express-validator");
const authController = require("../controllers/auth");
const orderController = require("../controllers/orders");

router.get("/", orderController.getOrders);

router.get(
  "/:id",
  [param("id", "Invalid order id").isMongoId()],
  orderController.getOrder
);

router.post(
  "/",
  authController.authMiddleware,
  [
    body("name", "Order name has to be atleast 3 char long")
      .trim()
      .isLength({ min: 3 }),
    body("items").isArray({ min: 1 }),
    body("category")
      .trim()
      .custom((value, { req }) => {
        const categories = [
          "Grocery",
          "Medicines",
          "Fish and Meat",
          "Stationary",
        ];
        if (!categories.includes(value)) {
          throw new Error("Invalid category");
        }
        return true;
      }),
    body("address.address").trim(),
    body("contact", "Invalid contact number")
      .trim()
      .isNumeric()
      .isLength({ min: 10, max: 10 }),
    check("paymentMethod.paymentType").isLength({ min: 1 }),
    check("paymentMethod.paymentId").isLength({ min: 1 }),
  ],
  orderController.addOrder
);

router.put(
  "/:id/accept",
  authController.authMiddleware,
  [param("id", "Invalid order id").isMongoId()],
  orderController.acceptOrder
);

router.put(
  "/:id/reject",
  authController.authMiddleware,
  [param("id", "Invalid order id").isMongoId()],
  orderController.rejectOrder
);

router.put(
  "/:id/complete",
  authController.authMiddleware,
  [param("id", "Invalid order id").isMongoId()],
  orderController.completeOrder
);

router.delete(
  "/:id",
  authController.authMiddleware,
  [param("id", "Invalid order id").isMongoId()],
  orderController.deleteOrder
);

router.put(
  "/:id",
  authController.authMiddleware,
  [param("id", "Invalid order id").isMongoId()],
  orderController.modifyOrder
);

module.exports = router;
