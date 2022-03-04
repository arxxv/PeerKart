const Redis = require("redis");
require("dotenv").config();
const url = `redis://default:${process.env.REDISPASS}@${
  process.env.REDISURI
}:${parseInt(process.env.REDISPORT)}`;
const redisClient = Redis.createClient({ url });
const DEF_EXP_TIME = 3600;
console.log(typeof process.env.REDISPORT);

module.exports.checkCache = async (key, cb) => {
  try {
    await redisClient.connect();
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
  }
};

module.exports.setCache = async (key, data) => {
  try {
    await redisClient.connect();
    await redisClient.set(key, JSON.stringify(data));
  } catch (error) {}
};

module.exports.deleteCache = async (key) => {
  try {
    await redisClient.connect();
    await redisClient.del(key);
  } catch (error) {}
};
