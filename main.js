const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const morgan = require("morgan");
require("dotenv").config();
const Redis = require("redis");
const cors = require("cors");

const userRouter = require("./routes/users");
const orderRouter = require("./routes/orders");
const authRouter = require("./routes/auth");

const app = express();
app.use(cors());
app.use(morgan("dev"));
app.use(bodyParser.json());
app.use("/api/v1/users", userRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/auth", authRouter);

app.get("/", (req, res) => {
  res.send("PeerKart™️");
});

const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.DB, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Started on port ${PORT}`);
    });
  });
