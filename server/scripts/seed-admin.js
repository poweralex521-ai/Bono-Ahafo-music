require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');

async function seedAdmin() {
  const { MONGODB_URI, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD } = process.env;
  if (!MONGODB_URI || !BOOTSTRAP_ADMIN_EMAIL || !BOOTSTRAP_ADMIN_PASSWORD) {
    throw new Error('Set MONGODB_URI, BOOTSTRAP_ADMIN_EMAIL, and BOOTSTRAP_ADMIN_PASSWORD in .env.');
  }
  if (BOOTSTRAP_ADMIN_PASSWORD.length < 12) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters.');
  }

  await mongoose.connect(MONGODB_URI);
  const email = BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    throw new Error(`An account already exists for ${email}; no account was changed.`);
  }

  const passwordHash = await bcrypt.hash(BOOTSTRAP_ADMIN_PASSWORD, 12);
  await User.create({
    fullName: 'BOMA Administrator',
    email,
    passwordHash,
    role: 'super_admin',
    status: 'active',
    emailVerifiedAt: new Date(),
  });
  console.log(`Created the initial administrator account for ${email}.`);
}

seedAdmin()
  .catch((error) => {
    console.error(`Admin setup failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
