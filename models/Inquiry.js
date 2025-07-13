const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  inquiryNumber: String,
  title: String,
  shortDescription: String,
  description: String
});

module.exports = mongoose.model('Inquiry', inquirySchema);
