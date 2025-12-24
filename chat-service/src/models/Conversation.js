const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["dm", "group"], required: true },
    name: { type: String, default: "" }, // used for group chats
    members: [{ type: String, required: true }], // store userId as string (from JWT sub)
    createdBy: { type: String, required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

conversationSchema.index({ members: 1 });

module.exports = mongoose.model("Conversation", conversationSchema);
