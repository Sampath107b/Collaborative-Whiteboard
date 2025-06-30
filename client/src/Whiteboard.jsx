import React, { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./Whiteboard.css";

//const socket = io("http://localhost:5000");
const socket = io("http://localhost:5000", {
  transports: ["websocket"],  // Force WebSocket to avoid polling fallback
});



socket.on("connect_error", (err) => {
  console.error("❌ Connection failed:", err.message);
});

const Whiteboard = () => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [socketId, setSocketId] = useState(null); // ✅ Moved inside component
  const history = useRef([]);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("🟢 Connected to socket:", socket.id);
      setSocketId(socket.id); // ✅ Inside component
    });
  }, []);


  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    canvas.width = 800;
    canvas.height = 500;
    canvas.style.width = "800px";
    canvas.style.height = "500px";
    context.lineCap = "round";
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    contextRef.current = context;

    socket.on("draw", ({ x, y, prevX, prevY, color, lineWidth }) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d"); // <--- Get fresh context
      ctx.save();
      ctx.strokeStyle = color;         // Use incoming color
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.restore();
    });

    socket.on("init", (strokes) => {
      const ctx = contextRef.current;
      strokes.forEach(({ x, y, prevX, prevY, color, lineWidth }) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(x, y);
      ctx.stroke();
    });
    }); 


    socket.on("canvasImage", (dataUrl) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
        contextRef.current.drawImage(img, 0, 0);
      };
    });

    socket.on("clearCanvas", () => {
      contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
    });
    socket.on("syncCanvas", (strokes) => {
      const ctx = contextRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      strokes.forEach(({ x, y, prevX, prevY, color, lineWidth }) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.stroke();
      });
    });

  }, []);

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = color;
      contextRef.current.lineWidth = lineWidth;
    }
  }, [color, lineWidth]);

  const lastX = useRef(0);
  const lastY = useRef(0);

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    setIsDrawing(true);
    lastX.current = offsetX;
    lastY.current = offsetY;
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    const ctx = contextRef.current;

    ctx.beginPath();
    ctx.moveTo(lastX.current, lastY.current);
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();

    socket.emit("draw", {
      x: offsetX,
      y: offsetY,
      prevX: lastX.current,
      prevY: lastY.current,
      color,
      lineWidth,
      userId: socket.id
    });

    lastX.current = offsetX;
    lastY.current = offsetY;
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const dataUrl = canvasRef.current.toDataURL();
    history.current.push(dataUrl);
    socket.emit("canvasImage", dataUrl);
  };

  const handleUndo = () => {
    socket.emit("undo");
  };


  const handleClear = () => {
    const ctx = contextRef.current;
    ctx.clearRect(0, 0, 800, 500);
    history.current = [];
    socket.emit("clearCanvas");
  };

  return (
    <div className="board-container">
      <h2 className="heading">🎨 Collaborative Whiteboard</h2>
      <div className="toolbar">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        <input
          type="range"
          min="1"
          max="20"
          value={lineWidth}
          onChange={(e) => setLineWidth(e.target.value)}
        />
        <button onClick={handleUndo}>Undo</button>
        <button onClick={handleClear}>Clear</button>
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="whiteboard"
      />
    </div>
  );
};

export default Whiteboard;