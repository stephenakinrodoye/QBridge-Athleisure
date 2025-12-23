const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },

    fullName: { type: String, required: true, trim: true },

    role: {
      type: String,
      enum: ["admin", "manager", "employee"],
      default: "employee",
      required: true,
    },

    phone: { type: String, default: "" },
    jobTitle: { type: String, default: "" },
    department: { type: String, default: "" },

    isActive: { type: Boolean, default: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
