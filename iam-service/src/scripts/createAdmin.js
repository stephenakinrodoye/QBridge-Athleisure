require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const email = process.env.ADMIN_EMAIL || "admin@qbridge.local";
  const password = process.env.ADMIN_PASSWORD || "ChangeMeNow_12345!";
  const fullName = process.env.ADMIN_NAME || "System Admin";

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    console.log("Admin already exists:", email);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await User.create({
    email: email.toLowerCase().trim(),
    passwordHash,
    fullName,
    role: "admin",
    isActive: true,
    createdBy: null,
  });

  console.log("Admin created:");
  console.log("Email:", email);
  console.log("Password:", password);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
