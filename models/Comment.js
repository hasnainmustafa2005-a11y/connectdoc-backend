// models/Comment.js
import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    blogId: { type: mongoose.Schema.Types.ObjectId, ref: "Blog", required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    rating: { type: Number, min: 1, max: 5 }, // optional
    text: { type: String, required: true, trim: true },
    ip: { type: String }, // for abuse tracking
    userAgent: { type: String },
    approved: { type: Boolean, default: true }, // set false if you want moderation
  },
  { timestamps: true }
);

export default mongoose.model("Comment", commentSchema);
