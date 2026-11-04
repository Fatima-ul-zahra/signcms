import { Router } from "express";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { collection } from "../db.js";
import { auth, signToken } from "../auth.js";
import { asyncHandler, rateLimit } from "../middleware/http.js";

const router = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: "Too many login attempts" });

const safeUser = (u) => ({ _id: u._id, email: u.email, name: u.name, role: u.role });

router.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await collection("users").findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    res.json({ token: signToken(user), user: safeUser(user) });
  })
);

router.get(
  "/me",
  auth,
  asyncHandler(async (req, res) => {
    const id = ObjectId.isValid(req.user.sub) ? new ObjectId(req.user.sub) : req.user.sub;
    const user = await collection("users").findOne({ _id: id });
    if (!user) return res.status(401).json({ error: "Account not found" });
    res.json({ user: safeUser(user) });
  })
);

export default router;
