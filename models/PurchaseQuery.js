const mongoose = require('mongoose');

const querySchema = new mongoose.Schema({
  purchaseOrderId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, enum: ['technical', 'general'], default: 'general' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PurchaseQuery', querySchema);