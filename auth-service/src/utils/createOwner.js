require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const email = "you@example.com";
  const password = "VeryStrongPassword123!";
  const existing = await User.findOne({ email });
  if (existing) {
    console.log("Owner already exists.");
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ email, passwordHash, fullName: "Owner", role: "owner" });

  console.log("Owner created:", email);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
