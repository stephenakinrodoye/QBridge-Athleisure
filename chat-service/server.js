require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const http = require("http");
const { Server } = require("socket.io");

const chatRoutes = require("./src/routes/chat.routes");
const { socketAuth } = require("./src/sockets/socketAuth");
const { registerSocketHandlers } = require("./src/sockets/handlers");

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

app.use("/chat", chatRoutes);

app.get("/", (req, res) => res.json({ status: "chat-service ok" }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.DASHBOARD_ORIGIN,
    credentials: true,
  },
});

io.use(socketAuth);

io.on("connection", (socket) => {
  registerSocketHandlers(io, socket);
});

async function start() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Chat MongoDB connected");

  const port = process.env.PORT || 4020;
  server.listen(port, () => console.log(`Chat service listening on ${port}`));
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
