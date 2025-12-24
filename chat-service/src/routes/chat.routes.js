const express = require("express");
const { z } = require("zod");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

router.get("/conversations", requireAuth, async (req, res) => {
  const userId = req.user.sub;

  const conversations = await Conversation.find({
    members: userId,
    isActive: true
  }).sort({ updatedAt: -1 });

  return res.json({ conversations });
});

router.get("/conversations/:id/messages", requireAuth, async (req, res) => {
  const userId = req.user.sub;
  const conversationId = req.params.id;

  const conv = await Conversation.findById(conversationId).select("members isActive");
  if (!conv || !conv.isActive) return res.status(404).json({ error: "Conversation not found" });
  if (!conv.members.includes(userId)) return res.status(403).json({ error: "Forbidden" });

  const messages = await Message.find({ conversationId })
    .sort({ createdAt: -1 })
    .limit(100);

  // return in chronological order
  return res.json({ messages: messages.reverse() });
});

module.exports = router;
