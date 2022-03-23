const Redis = require("redis");
require("dotenv").config();
const url = process.env.REDISURL;
const redisClient = Redis.createClient({ url });
const DEF_EXP_TIME = 3600;

let connected = 1;

(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    connected = 0;
    console.log("err", error);
  }
})();

module.exports.checkCache = async (key, cb) => {
  try {
    return new Promise(async (resolve, reject) => {
      if (connected) {
        const data = await redisClient.get(key);
        if (data) return resolve(JSON.parse(data));
      }
      const newData = await cb();
      if (connected) {
        try {
          await redisClient.setEx(key, DEF_EXP_TIME, JSON.stringify(newData));
        } catch (error) {}
      }
      resolve(newData);
    });
  } catch (error) {
    console.log(error);
  }
};

module.exports.setCache = async (key, data) => {
  try {
    if (connected) {
      await redisClient.set(key, JSON.stringify(data));
    }
  } catch (error) {
    console.log(error);
  }
};

module.exports.deleteCache = async (key) => {
  try {
    if (connected) {
      await redisClient.del(key);
    }
  } catch (error) {
    console.log(error);
  }
};
