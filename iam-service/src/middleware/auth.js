const { verifyToken } = require("../utils/jwt");

function requireAuth(req, res, next) {
  const cookieName = process.env.COOKIE_NAME || "qbridge_iam";
  const token =
    req.cookies?.[cookieName] ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null);

  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    req.user = verifyToken(token); // { sub, email, role }
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.role) return res.status(403).json({ error: "Forbidden" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    return next();
  };
}

module.exports = { requireAuth, requireRole };
