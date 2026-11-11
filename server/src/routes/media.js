import { Router } from "express";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { collection } from "../db.js";
import { getBucket } from "../storage.js";
import { config } from "../config.js";
import { auth, allow } from "../auth.js";
import { asyncHandler, HttpError } from "../middleware/http.js";

// An upload waits here for a moment, is copied into the database, and the temporary copy is deleted.
const tempDir = path.resolve(process.cwd(), config.uploadDir);
fs.mkdirSync(tempDir, { recursive: true });

// Extension comes from the validated MIME type, never from the client's filename.
const ALLOWED_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, tempDir),
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
    const { path: tempPath, filename, mimetype, size, originalname } = req.file;

    try {
      await pipeline(
        fs.createReadStream(tempPath),
        getBucket().openUploadStream(filename, { metadata: { contentType: mimetype } })
      );
    } finally {
      await fs.promises.rm(tempPath, { force: true });
    }

    const item = {
      _id: crypto.randomUUID(),
      name: String(req.body.name || originalname).slice(0, 120),
      filename,
      mimeType: mimetype,
      size,
      url: `/uploads/${filename}`,
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

    // Remove the stored file too (older records may have no stored file).
    const bucket = getBucket();
    const [stored] = await bucket.find({ filename: item.filename }).limit(1).toArray();
    if (stored) await bucket.delete(stored._id);

    res.json({ ok: true });
  })
);

export default router;

// ---------- Serving the stored files: GET /uploads/<name> ----------
const FILENAME_PATTERN = /^[a-f0-9-]{36}\.(jpg|png|webp|mp4)$/;

export const filesRouter = Router();

filesRouter.get(
  "/:filename",
  asyncHandler(async (req, res) => {
    const { filename } = req.params;
    if (!FILENAME_PATTERN.test(filename)) return res.sendStatus(404);

    const bucket = getBucket();
    const [file] = await bucket.find({ filename }).limit(1).toArray();
    if (!file) return res.sendStatus(404);

    const size = file.length;
    res.set({
      "Content-Type": file.metadata?.contentType || "application/octet-stream",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable", // names are unique, so files never change
    });

    // Support partial requests so videos can start and seek quickly.
    let start = 0;
    let end = size - 1; // inclusive
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    if (range && (range[1] || range[2])) {
      if (range[1] === "") {
        start = Math.max(0, size - Number(range[2])); // last N bytes
      } else {
        start = Number(range[1]);
        if (range[2] !== "") end = Math.min(Number(range[2]), size - 1);
      }
      if (start >= size || start > end) {
        res.set("Content-Range", `bytes */${size}`);
        return res.sendStatus(416);
      }
      res.status(206).set({ "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1 });
    } else {
      res.set("Content-Length", size);
    }

    if (size === 0) return res.end();
    const stream = bucket.openDownloadStreamByName(filename, { start, end: end + 1 });
    stream.on("error", (err) => res.destroy(err));
    stream.pipe(res);
  })
);
