import { Router } from "express";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { collection } from "../db.js";
import { config } from "../config.js";
import { auth, allow } from "../auth.js";
import { asyncHandler, HttpError } from "../middleware/http.js";

export const uploadDir = path.resolve(process.cwd(), config.uploadDir);
fs.mkdirSync(uploadDir, { recursive: true });

// Extension comes from the validated MIME type, never from the client's filename.
const ALLOWED_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, crypto.randomUUID() + ALLOWED_TYPES[file.mimetype]),
  }),
  limits: { fileSize: config.maxUploadBytes },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES[file.mimetype]) return cb(null, true);
    cb(new HttpError(400, "Only JPEG, PNG, WebP and MP4 files are allowed"));
  },
});

const router = Router();
const canEdit = allow("owner", "admin", "editor");

router.get(
  "/",
  auth,
  asyncHandler(async (_req, res) => {
    res.json(await collection("media").find().sort({ createdAt: -1 }).toArray());
  })
);

router.post(
  "/",
  auth,
  canEdit,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Choose a file" });
    const item = {
      _id: crypto.randomUUID(),
      name: String(req.body.name || req.file.originalname).slice(0, 120),
      filename: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`,
      createdAt: new Date(),
      createdBy: req.user.sub,
    };
    await collection("media").insertOne(item);
    res.status(201).json(item);
  })
);

router.delete(
  "/:id",
  auth,
  canEdit,
  asyncHandler(async (req, res) => {
    const inUse = await collection("playlists").countDocuments({ "items.mediaId": req.params.id });
    if (inUse) return res.status(409).json({ error: "Media is used by a playlist" });
    const item = await collection("media").findOne({ _id: req.params.id });
    if (!item) return res.sendStatus(404);
    await collection("media").deleteOne({ _id: item._id });
    fs.rmSync(path.join(uploadDir, path.basename(item.filename)), { force: true });
    res.json({ ok: true });
  })
);

export default router;
