import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import roomRoutes from "./routes/rooms";
import analyticsRoutes from "./routes/analytics";
import { initSocket } from "./socket";

const app = express();
const httpServer = createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const NODE_ENV = process.env.NODE_ENV || "development";

// ── Security headers ────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // handled by Next.js on frontend
    crossOriginEmbedderPolicy: false,
  })
);

// ── CORS ────────────────────────────────────────────────────────
const allowedOrigins = CLIENT_URL.split(",").map((o) => o.trim());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Body parsing with size limit ─────────────────────────────────
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: false, limit: "32kb" }));

// ── Global rate limiter ─────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

// ── Strict limiter for room creation ────────────────────────────
const createRoomLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many rooms created, slow down." },
});

app.use(globalLimiter);

// ── Socket.IO ────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 20000,
  pingInterval: 10000,
  maxHttpBufferSize: 1e5, // 100kb max socket message
});

// ── Routes ───────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => res.json({ status: "ok", env: NODE_ENV }));
app.use("/api/rooms", createRoomLimiter, roomRoutes);
app.use("/api/analytics", analyticsRoutes);

// ── 404 handler ──────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// ── Global error handler ─────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status || 500;
  const message = NODE_ENV === "production" ? "Internal server error" : err.message;
  console.error(`[error] ${status}:`, err.message);
  res.status(status).json({ error: message });
});

initSocket(io);

const PORT = Number(process.env.PORT) || 4000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`[server] running on port ${PORT} (${NODE_ENV})`);
});

export default app;
