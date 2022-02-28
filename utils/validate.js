const mongoose = require("mongoose");

module.exports.userid = (req) => {
  const error = {};
  const checkObject = new RegExp("^[0-9a-fA-F]{24}$");
  if (!checkObject.test(req.params.id)) error.id = "Not valid userid";
};
