const Redis = require("redis");
const redisClient = Redis.createClient({
  host: "redis-11538.c8.us-east-1-3.ec2.cloud.redislabs.com",
  port: 11538,
});
const DEF_EXP_TIME = 3600;

module.exports.checkCache = async (key, cb) => {
  try {
    console.log("hi");
    await redisClient.connect();
    console.log("connected");
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
