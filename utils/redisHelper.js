const Redis = require("redis");
require("dotenv").config();
const url = process.env.REDISURL;
const redisClient = Redis.createClient({ url });
const DEF_EXP_TIME = 3600;
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.log("err", error);
  }
})();

module.exports.checkCache = async (key, cb) => {
  try {
    return new Promise(async (resolve, reject) => {
      const data = await redisClient.get(key);
      if (data) return resolve(JSON.parse(data));
      const newData = await cb();
      try {
        await redisClient.setEx(key, DEF_EXP_TIME, JSON.stringify(newData));
      } catch (error) {}
      resolve(newData);
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: { msg: "Server error" } });
  }
};

module.exports.setCache = async (key, data) => {
  try {
    await redisClient.set(key, JSON.stringify(data));
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: { msg: "Server error" } });
  }
};

module.exports.deleteCache = async (key) => {
  try {
    await redisClient.del(key);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: { msg: "Server error" } });
  }
};
