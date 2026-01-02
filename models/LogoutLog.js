import mongoose from "mongoose";

const logoutLogSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    reason: {
      type: String,
      enum: ["MANUAL", "INACTIVITY"],
      required: true,
    },
    loggedOutAt: {
      type: Date,
      default: Date.now,
    },
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true }
);

export default mongoose.model("LogoutLog", logoutLogSchema);
