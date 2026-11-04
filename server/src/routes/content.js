import { Router } from "express";
import crypto from "node:crypto";
import { collection } from "../db.js";
import { auth, allow } from "../auth.js";
import { asyncHandler } from "../middleware/http.js";

export const playlistsRouter = Router();
export const campaignsRouter = Router();
const canEdit = allow("owner", "admin", "editor");

const clamp = (value, min, max, fallback) => Math.max(min, Math.min(max, Number(value) || fallback));

function parseItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({ mediaId: String(item.mediaId), duration: clamp(item.duration, 3, 3600, 10) }));
}

// ---------- Playlists ----------
playlistsRouter.get(
  "/",
  auth,
  asyncHandler(async (_req, res) => {
    res.json(await collection("playlists").find().sort({ createdAt: -1 }).toArray());
  })
);

playlistsRouter.post(
  "/",
  auth,
  canEdit,
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "Playlist name is required" });
    const playlist = {
      _id: crypto.randomUUID(),
      name,
      items: parseItems(req.body.items),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await collection("playlists").insertOne(playlist);
    res.status(201).json(playlist);
  })
);

playlistsRouter.put(
  "/:id",
  auth,
  canEdit,
  asyncHandler(async (req, res) => {
    const updated = await collection("playlists").findOneAndUpdate(
      { _id: req.params.id },
      { $set: { name: String(req.body.name || "Untitled"), items: parseItems(req.body.items), updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!updated) return res.sendStatus(404);
    res.json(updated);
  })
);

// ---------- Campaigns ----------
const CAMPAIGN_STATUSES = ["draft", "active", "paused", "ended"];
const toDateOrNull = (value) => (value ? new Date(value) : null);

campaignsRouter.get(
  "/",
  auth,
  asyncHandler(async (_req, res) => {
    res.json(await collection("campaigns").find().sort({ createdAt: -1 }).toArray());
  })
);

campaignsRouter.post(
  "/",
  auth,
  canEdit,
  asyncHandler(async (req, res) => {
    const campaign = {
      _id: crypto.randomUUID(),
      name: String(req.body.name || "Untitled campaign"),
      playlistId: String(req.body.playlistId || ""),
      status: "draft",
      startsAt: toDateOrNull(req.body.startsAt),
      endsAt: toDateOrNull(req.body.endsAt),
      screenIds: Array.isArray(req.body.screenIds) ? req.body.screenIds.map(String) : [],
      createdAt: new Date(),
    };
    await collection("campaigns").insertOne(campaign);
    res.status(201).json(campaign);
  })
);

campaignsRouter.patch(
  "/:id/status",
  auth,
  allow("owner", "admin"),
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!CAMPAIGN_STATUSES.includes(status)) return res.status(400).json({ error: "Invalid campaign status" });
    const result = await collection("campaigns").updateOne({ _id: req.params.id }, { $set: { status } });
    if (!result.matchedCount) return res.sendStatus(404);
    res.json({ ok: true, status });
  })
);
