// routes/commentRoutes.js
import express from "express";
import Comment from "../models/Comment.js";
import rateLimit from "express-rate-limit"; // optional, install if using

const router = express.Router();

// OPTIONAL: light rate limiter for comment posting
const createLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // max 5 comment posts per IP per minute
  message: { success: false, message: "Too many comments, try again later." },
});

// POST a comment (anyone)
router.post("/", createLimiter, async (req, res) => {
  try {
    const { blogId, name, email, rating, text } = req.body;
    if (!blogId || !name || !text) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const comment = new Comment({
      blogId,
      name: name.trim(),
      email: email ? email.trim() : undefined,
      rating: rating ? Number(rating) : undefined,
      text: text.trim(),
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers["user-agent"] || "",
      approved: true, // toggle to false if you want manual moderation
    });

    await comment.save();
    res.status(201).json({ success: true, comment });
  } catch (err) {
    console.error("❌ Error saving comment:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// GET comments for a blog (paginated)
router.get("/:blogId", async (req, res) => {
  try {
    const { blogId } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);

    const query = { blogId };
    // If moderation: only show approved
    // query.approved = true;

    const comments = await Comment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Comment.countDocuments(query);

    res.json({ success: true, comments, page, limit, total });
  } catch (err) {
    console.error("❌ Error fetching comments:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

export default router;
