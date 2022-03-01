const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const morgan = require("morgan");
require("dotenv").config();

const userRouter = require("./routes/users");
const orderRouter = require("./routes/orders");
const authRouter = require("./routes/auth");

const app = express();

app.use(morgan("dev"));
app.use(bodyParser.json());
app.use("/api/v1/users", userRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/auth", authRouter);

app.get("/", (req, res) => {
  res.send("PeerKart™️");
});

const PORT = 3000 || process.env.PORT;

mongoose
  .connect(process.env.DB, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Started on http://localhost:${PORT}`);
    });
  });
