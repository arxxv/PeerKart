const NodeGeocoder = require("node-geocoder");

const options = {
  provider: "google",
  httpAdapter: "https",
  apiKey: process.env.MAPKEY,
  formatter: null,
};

const geocoder = NodeGeocoder(options);
module.exports = geocoder;
