import { Router } from "express";
import { collection } from "../db.js";
import { auth } from "../auth.js";
import { asyncHandler } from "../middleware/http.js";

const router = Router();

router.get(
  "/dashboard",
  auth,
  asyncHandler(async (_req, res) => {
    const [screens, totalMedia, totalPlaylists, activeCampaigns, onlineScreens] = await Promise.all([
      collection("screens").countDocuments(),
      collection("media").countDocuments(),
      collection("playlists").countDocuments(),
      collection("campaigns").countDocuments({ status: "active" }),
      collection("screens").countDocuments({ status: "online" }),
    ]);
    res.json({ screens, totalMedia, totalPlaylists, activeCampaigns, onlineScreens, offlineScreens: screens - onlineScreens });
  })
);

router.get(
  "/activity",
  auth,
  asyncHandler(async (_req, res) => {
    res.json(await collection("activityLogs").find().sort({ createdAt: -1 }).limit(50).toArray());
  })
);

export default router;
