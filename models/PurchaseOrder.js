const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  purchaseNumber: { type: String, required: true, unique: true }, // e.g. PO-0001
  title:          { type: String, required: true },
  description:    { type: String, default: '' },

  // Backend-controlled current status (shown read-only in UI)
  status: { type: String, default: 'pending' }, // pending | approved | shipped | closed | etc.

  // (Optional future usage)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);