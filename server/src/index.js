import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config, assertConfig } from "./config.js";
import { connectDb, collection } from "./db.js";
import { errorHandler } from "./middleware/http.js";
import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import mediaRoutes, { filesRouter } from "./routes/media.js";
import { screensRouter, playerRouter } from "./routes/screens.js";
import { playlistsRouter, campaignsRouter } from "./routes/content.js";

assertConfig();

const app = express();
if (config.trustProxy) app.set("trust proxy", 1); // needed behind nginx/Caddy so rate limits see real IPs

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: config.corsOrigins, credentials: false }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/uploads", filesRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "SignCMS API" }));
app.use("/api/auth", authRoutes);
app.use("/api", dashboardRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/screens", screensRouter);
app.use("/api/player", playerRouter);
app.use("/api/playlists", playlistsRouter);
app.use("/api/campaigns", campaignsRouter);
app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

await connectDb();

// Mark screens offline when their heartbeat stops.
setInterval(() => {
  collection("screens")
    .updateMany(
      { status: "online", lastSeenAt: { $lt: new Date(Date.now() - config.offlineAfterMs) } },
      { $set: { status: "offline" } }
    )
    .catch((err) => console.error("Offline sweep failed:", err.message));
}, 15 * 1000).unref();

app.listen(config.port, () => console.log(`SignCMS API running on port ${config.port}`));
