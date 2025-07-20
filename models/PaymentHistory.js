const mongoose = require('mongoose');

const paymentHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
  qtyNumber: { type: Number, required: true },
  amount: { type: Number, required: true },

  // future extension: hrCompliancePdfUrl, techQtyPdfUrl, signaturePdfUrl
  status: { type: String, default: 'submitted' },
}, { timestamps: true });

module.exports = mongoose.model('PaymentHistory', paymentHistorySchema);
