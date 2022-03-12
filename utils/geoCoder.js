const axios = require("axios").default;
require("dotenv").config();

exports.geocode = async (address) => {
  const options = {
    method: "GET",
    url: "https://forward-reverse-geocoding.p.rapidapi.com/v1/search",
    params: {
      q: address,
      "accept-language": "en",
      polygon_threshold: "0.0",
    },
    headers: {
      "x-rapidapi-host": "forward-reverse-geocoding.p.rapidapi.com",
      "x-rapidapi-key": RAPIDKEY,
    },
  };

  try {
    const data = await axios.request(options);
    return data.data;
  } catch (error) {
    console.log(error);
  }
};
