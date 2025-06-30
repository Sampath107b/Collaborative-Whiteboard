const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(
  cors({
    origin: "https://collaborative-whiteboard-1-22lq.onrender.com",
    methods: ["GET", "POST"],
    credentials: true,
  })
);


const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://collaborative-whiteboard-1-22lq.onrender.com",
    methods: ["GET", "POST"],
    credentials: true,
  },
});



let strokes = [];

io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  socket.emit("init", strokes); // send all existing strokes

  socket.on("draw", (data) => {
    strokes.push({ ...data, userId: socket.id });
    socket.broadcast.emit("draw", data);
  });

  socket.on("undo", () => {
    strokes = strokes.filter((stroke) => stroke.userId !== socket.id || stroke.keep);
    const userStrokes = strokes.filter(s => s.userId !== socket.id || s.keep !== false);
    io.emit("syncCanvas", userStrokes);
  });

  socket.on("clearCanvas", () => {
    strokes = [];
    io.emit("clearCanvas");
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});



server.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});