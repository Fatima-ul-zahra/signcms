import { Router } from "express";
import crypto from "node:crypto";
import { collection } from "../db.js";
import { config } from "../config.js";
import { auth, allow } from "../auth.js";
import { asyncHandler, rateLimit } from "../middleware/http.js";

export const screensRouter = Router();
export const playerRouter = Router();

const pairLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 20, message: "Too many pairing attempts" });

// ---------- Admin: screens ----------
screensRouter.get(
  "/",
  auth,
  asyncHandler(async (_req, res) => {
    const screens = await collection("screens")
      .find({}, { projection: { deviceToken: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(screens);
  })
);

screensRouter.post(
  "/pairing-codes",
  auth,
  allow("owner", "admin"),
  asyncHandler(async (req, res) => {
    const code = String(crypto.randomInt(100000, 1000000));
    await collection("pairingRequests").insertOne({
      code,
      label: String(req.body.label || "New screen").slice(0, 80),
      used: false,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + config.pairingCodeTtlMs),
    });
    res.status(201).json({ code, expiresInMinutes: config.pairingCodeTtlMs / 60000 });
  })
);

screensRouter.post(
  "/:id/assign-playlist",
  auth,
  allow("owner", "admin", "editor"),
  asyncHandler(async (req, res) => {
    const playlist = await collection("playlists").findOne({ _id: String(req.body.playlistId) });
    if (!playlist) return res.status(404).json({ error: "Playlist not found" });
    const result = await collection("screens").updateOne(
      { screenId: req.params.id },
      { $set: { playlistId: playlist._id } }
    );
    if (!result.matchedCount) return res.sendStatus(404);
    res.json({ ok: true });
  })
);

// ---------- Player (device) ----------
async function playerAuth(req, res, next) {
  try {
    const token = req.headers["x-device-token"];
    if (!token) return res.status(401).json({ error: "Device token required" });
    const screen = await collection("screens").findOne({ deviceToken: String(token) });
    if (!screen) return res.status(401).json({ error: "Unknown device" });
    req.screen = screen;
    next();
  } catch (err) {
    next(err);
  }
}

playerRouter.post(
  "/pair",
  pairLimiter,
  asyncHandler(async (req, res) => {
    const code = String(req.body.code || "");
    // Atomically claim the code so it can only be used once.
    const request = await collection("pairingRequests").findOneAndUpdate(
      { code, used: false, expiresAt: { $gt: new Date() } },
      { $set: { used: true } }
    );
    if (!request) return res.status(400).json({ error: "Pairing code is invalid or expired" });

    const screen = {
      screenId: crypto.randomUUID(),
      name: request.label,
      status: "online",
      deviceToken: crypto.randomBytes(32).toString("hex"),
      lastSeenAt: new Date(),
      createdAt: new Date(),
      orientation: "landscape",
    };
    await collection("screens").insertOne(screen);
    res.status(201).json({ screenId: screen.screenId, deviceToken: screen.deviceToken, name: screen.name });
  })
);

playerRouter.post(
  "/heartbeat",
  playerAuth,
  asyncHandler(async (req, res) => {
    await collection("screens").updateOne(
      { _id: req.screen._id },
      { $set: { status: "online", lastSeenAt: new Date(), currentMediaId: req.body.currentMediaId || null } }
    );
    res.json({ ok: true, serverTime: new Date() });
  })
);

playerRouter.get(
  "/sync",
  playerAuth,
  asyncHandler(async (req, res) => {
    const { screen } = req;
    const playlist = screen.playlistId
      ? await collection("playlists").findOne({ _id: screen.playlistId })
      : null;
    const mediaIds = (playlist?.items || []).map((item) => item.mediaId);
    const media = mediaIds.length
      ? await collection("media").find({ _id: { $in: mediaIds } }).toArray()
      : [];
    const mediaById = new Map(media.map((m) => [m._id, m]));

    res.json({
      screen: { screenId: screen.screenId, name: screen.name },
      playlist: playlist
        ? {
            name: playlist.name,
            items: playlist.items
              .map((item) => ({ ...item, media: mediaById.get(item.mediaId) || null }))
              .filter((item) => item.media),
          }
        : null,
      mediaBaseUrl: "",
    });
  })
);
