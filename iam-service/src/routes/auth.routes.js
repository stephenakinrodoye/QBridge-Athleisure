const express = require("express");
const bcrypt = require("bcrypt");
const { z } = require("zod");

const User = require("../models/User");
const { signToken } = require("../utils/jwt");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function setAuthCookie(res, token) {
  const cookieName = process.env.COOKIE_NAME || "qbridge_iam";
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

  const user = await User.findOne({ email: email.toLowerCase().trim(), isActive: true });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  setAuthCookie(res, token);

  return res.json({
    message: "Logged in",
    user: { id: user._id, email: user.email, fullName: user.fullName, role: user.role },
  });
});

router.post("/logout", (req, res) => {
  const cookieName = process.env.COOKIE_NAME || "qbridge_iam";
  res.clearCookie(cookieName);
  return res.json({ message: "Logged out" });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.sub).select(
    "email fullName role phone jobTitle department isActive createdAt updatedAt"
  );

  if (!user || !user.isActive) return res.status(404).json({ error: "User not found" });

  return res.json({
    user: {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      jobTitle: user.jobTitle,
      department: user.department,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});

module.exports = router;
