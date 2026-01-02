import mongoose from "mongoose";

const adminActivitySchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
  action: {
    type: String,
    enum: ["LOGIN", "LOGOUT", "AUTO_LOGOUT"],
    required: true,
  },
  ipAddress: String,
  userAgent: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("AdminActivity", adminActivitySchema);
