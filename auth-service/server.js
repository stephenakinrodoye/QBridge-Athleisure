require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");

const authRoutes = require("./src/routes/auth.routes");

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.DASHBOARD_ORIGIN,
    credentials: true,
  })
);

app.use(
  "/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
  })
);

app.use("/auth", authRoutes);

app.get("/", (req, res) => res.json({ status: "auth-service ok" }));

async function start() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Auth MongoDB connected");

  const port = process.env.PORT || 4010;
  app.listen(port, () => console.log(`Auth service on port ${port}`));
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
