const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    talent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizerName: { type: String, required: true, trim: true, maxlength: 120 },
    organizerEmail: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    organizerPhone: { type: String, required: true, trim: true, maxlength: 40 },
    eventName: { type: String, required: true, trim: true, maxlength: 160 },
    eventDate: { type: Date, required: true },
    location: { type: String, required: true, trim: true, maxlength: 160 },
    details: { type: String, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
