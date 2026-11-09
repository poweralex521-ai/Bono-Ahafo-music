const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, select: false },
    role: {
      type: String,
      enum: ['super_admin', 'coordinator', 'member'],
      default: 'member',
      required: true,
    },
    status: {
      type: String,
      enum: ['invited', 'pending', 'active', 'suspended'],
      default: 'pending',
      required: true,
    },
    membershipId: { type: String, unique: true, sparse: true, trim: true },
    group: { type: String, trim: true, maxlength: 120 },
    coordinatorGroup: { type: String, trim: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 40 },
    profession: { type: String, trim: true, maxlength: 80 },
    instruments: [{ type: String, trim: true, maxlength: 60 }],
    location: { type: String, trim: true, maxlength: 120 },
    genres: [{ type: String, trim: true, maxlength: 60 }],
    biography: { type: String, trim: true, maxlength: 2000 },
    profilePhotoUrl: { type: String, trim: true, maxlength: 1000 },
    bookingPrice: { type: Number, min: 0 },
    yearsExperience: { type: Number, min: 0, max: 100 },
    availability: { type: String, trim: true, maxlength: 120 },
    portfolioUrl: { type: String, trim: true, maxlength: 1000 },
    publicProfileApproved: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date },
    profileApprovalStatus: {
      type: String,
      enum: ['not_submitted', 'pending', 'approved', 'rejected'],
      default: 'not_submitted',
    },
  },
  { timestamps: true }
);

userSchema.index({ status: 1, publicProfileApproved: 1, profession: 1, location: 1 });

module.exports = mongoose.model('User', userSchema);
