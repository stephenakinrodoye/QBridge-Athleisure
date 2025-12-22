const express = require("express");
const bcrypt = require("bcrypt");
const { z } = require("zod");
const User = require("../models/User");
const { signToken } = require("../utils/jwt");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10), // stronger for staff
  fullName: z.string().min(1).optional(),
  role: z.enum(["owner", "ops", "viewer"]).optional(),
});

function setAuthCookie(res, token) {
  const cookieName = process.env.COOKIE_NAME || "qbridge_auth";
  const isProd = process.env.NODE_ENV === "production";

  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;

  const user = await User.findOne({ email, isActive: true });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({ sub: user._id.toString(), email: user.email, role: user.role });
  setAuthCookie(res, token);

  return res.json({
    message: "Logged in",
    user: { id: user._id, email: user.email, fullName: user.fullName, role: user.role },
  });
});

router.post("/logout", (req, res) => {
  const cookieName = process.env.COOKIE_NAME || "qbridge_auth";
  res.clearCookie(cookieName);
  return res.json({ message: "Logged out" });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.sub).select("email fullName role isActive createdAt");
  if (!user || !user.isActive) return res.status(404).json({ error: "User not found" });
  return res.json({ user });
});

// IMPORTANT: internal staff onboarding — owner creates users (NOT public registration)
router.post("/users", requireAuth, requireRole("owner"), async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password, fullName, role } = parsed.data;

  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: "Email already exists" });

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    email,
    passwordHash,
    fullName: fullName || "",
    role: role || "ops",
  });

  return res.status(201).json({
    message: "User created",
    user: { id: user._id, email: user.email, fullName: user.fullName, role: user.role },
  });
});

module.exports = router;
