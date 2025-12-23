require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");

const authRoutes = require("./src/routes/auth.routes");
const employeesRoutes = require("./src/routes/employees.routes");

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
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
  })
);

app.use("/auth", authRoutes);
app.use("/employees", employeesRoutes);

app.get("/", (req, res) => res.json({ status: "iam-service ok" }));

async function start() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("IAM MongoDB connected");

  const port = process.env.PORT || 4010;
  app.listen(port, () => console.log(`IAM service running on port ${port}`));
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
