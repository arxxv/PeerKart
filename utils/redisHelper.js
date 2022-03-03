const Redis = require("redis");
require("dotenv").config();
const redisClient = Redis.createClient({
  host: process.env.REDISHOST,
  port: process.env.PORT,
});
const DEF_EXP_TIME = 3600;

module.exports.checkCache = async (key, cb) => {
  try {
    await redisClient.connect();
  } catch (error) {}
  return new Promise(async (resolve, reject) => {
    const data = await redisClient.get(key);
    if (data) return resolve(JSON.parse(data));
    const newData = await cb();
    try {
      await redisClient.setEx(key, DEF_EXP_TIME, JSON.stringify(newData));
    } catch (error) {}
    resolve(newData);
  });
};

module.exports.setCache = async (key, data) => {
  try {
    await redisClient.connect();
  } catch (error) {}
  await redisClient.set(key, JSON.stringify(data));
};

module.exports.deleteCache = async (key) => {
  try {
    await redisClient.connect();
  } catch (error) {}
  await redisClient.del(key);
};
