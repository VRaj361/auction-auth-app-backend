const mongoose = require('mongoose');

const companyChangeRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Proposed new values (all optional)
  companyName: String,
  companyAddress: String,
  companyPhone: String,
  companyEmail: String,
  companyGst: String,
  companyPan: String,
  companyBanker: String,
  companyAccountNo: String,
  companyTurnoverPdfUrl: String,

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminComment: String,
  reviewedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('CompanyChangeRequest', companyChangeRequestSchema);
