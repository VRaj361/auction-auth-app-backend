const mongoose = require('mongoose');

const inquiryStatusSchema = new mongoose.Schema({
  userId: String,
  inquiryNumber: String,
  inquiryId: String,
  status: String
});

module.exports = mongoose.model('InquiryStatus', inquiryStatusSchema);