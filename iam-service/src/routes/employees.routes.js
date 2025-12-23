const express = require("express");
const bcrypt = require("bcrypt");
const { z } = require("zod");

const User = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Admin/Manager creates employees (this replaces public registration)
const createEmployeeSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  fullName: z.string().min(1),
  role: z.enum(["admin", "manager", "employee"]).default("employee"),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
});

const updateEmployeeSchema = z.object({
  fullName: z.string().min(1).optional(),
  role: z.enum(["admin", "manager", "employee"]).optional(),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  isActive: z.boolean().optional(), // allow admin/manager to deactivate/reactivate
});

const updateMeSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
});

// Manager/Admin: list employees
router.get("/", requireAuth, requireRole("admin", "manager"), async (req, res) => {
  const employees = await User.find().select(
    "email fullName role phone jobTitle department isActive createdAt updatedAt"
  );
  return res.json({ employees });
});

// Manager/Admin: view a specific employee
router.get("/:id", requireAuth, requireRole("admin", "manager"), async (req, res) => {
  const user = await User.findById(req.params.id).select(
    "email fullName role phone jobTitle department isActive createdAt updatedAt"
  );
  if (!user) return res.status(404).json({ error: "Employee not found" });
  return res.json({ employee: user });
});

// Manager/Admin: create employee
router.post("/", requireAuth, requireRole("admin", "manager"), async (req, res) => {
  const parsed = createEmployeeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const data = parsed.data;
  const email = data.email.toLowerCase().trim();

  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: "Email already exists" });

  const passwordHash = await bcrypt.hash(data.password, 12);

  const created = await User.create({
    email,
    passwordHash,
    fullName: data.fullName,
    role: data.role,
    phone: data.phone || "",
    jobTitle: data.jobTitle || "",
    department: data.department || "",
    createdBy: req.user.sub,
    isActive: true,
  });

  return res.status(201).json({
    message: "Employee created",
    employee: {
      id: created._id,
      email: created.email,
      fullName: created.fullName,
      role: created.role,
      isActive: created.isActive,
    },
  });
});

// Manager/Admin: update employee
router.patch("/:id", requireAuth, requireRole("admin", "manager"), async (req, res) => {
  const parsed = updateEmployeeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const updated = await User.findByIdAndUpdate(req.params.id, parsed.data, {
    new: true,
  }).select("email fullName role phone jobTitle department isActive updatedAt");

  if (!updated) return res.status(404).json({ error: "Employee not found" });

  return res.json({ message: "Employee updated", employee: updated });
});

// Manager/Admin: “delete” employee == deactivate
router.delete("/:id", requireAuth, requireRole("admin", "manager"), async (req, res) => {
  const updated = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  ).select("email fullName role isActive updatedAt");

  if (!updated) return res.status(404).json({ error: "Employee not found" });

  return res.json({ message: "Employee deactivated", employee: updated });
});

// Employee: edit own profile
router.patch("/me/profile", requireAuth, async (req, res) => {
  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const updated = await User.findByIdAndUpdate(req.user.sub, parsed.data, {
    new: true,
  }).select("email fullName role phone jobTitle department isActive updatedAt");

  if (!updated || !updated.isActive) return res.status(404).json({ error: "User not found" });

  return res.json({ message: "Profile updated", user: updated });
});

module.exports = router;
