const jwt = require("jsonwebtoken");

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  cookieHeader.split(";").forEach((part) => {
    const [k, ...v] = part.trim().split("=");
    out[k] = decodeURIComponent(v.join("="));
  });
  return out;
}

function socketAuth(socket, next) {
  try {
    const cookieName = process.env.COOKIE_NAME || "qbridge_iam";

    // Prefer cookie (best for Next.js same-site)
    const cookies = parseCookies(socket.request.headers.cookie);
    const tokenFromCookie = cookies[cookieName];

    // Fallback: token provided in socket handshake auth
    const tokenFromAuth = socket.handshake.auth?.token;

    const token = tokenFromCookie || tokenFromAuth;
    if (!token) return next(new Error("Not authenticated"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // { sub, email, role }
    return next();
  } catch {
    return next(new Error("Invalid or expired token"));
  }
}

module.exports = { socketAuth };
