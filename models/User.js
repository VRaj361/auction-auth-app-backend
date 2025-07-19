const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  password: String,

  companyName: String,
  companyAddress: String,
  companyPhone: String,
  companyEmail: String,
  companyGst: String,
  companyPan: String,
  companyBanker: String,
  companyAccountNo: String,
  companyTurnoverPdfUrl: String, // served path (e.g. /uploads/turnover/xxx.pdf)
});

module.exports = mongoose.model('User', userSchema);