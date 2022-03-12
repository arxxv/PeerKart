const axios = require("axios").default;

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
      "x-rapidapi-key": "fd80e9f099mshdc19f0337fbe93ap128040jsnca3a1e8554b3",
    },
  };

  try {
    const data = await axios.request(options);
    return data.data;
  } catch (error) {
    console.log(error);
  }
};
