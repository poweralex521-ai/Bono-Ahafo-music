const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, maxlength: 100 },
    target: { type: String, required: true, maxlength: 120 },
    details: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
