import mongoose from "mongoose";

const dateOverrideSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String, // "09:00"
      required: true,
    },
    endTime: {
      type: String, // "17:00"
      required: true,
    },
    reason: {
      type: String,
      default: "Admin override",
    },
  },
  { timestamps: true }
);

// Optional: ensure unique override per doctor per date
dateOverrideSchema.index({ doctorId: 1, date: 1 }, { unique: true });

const DateOverride = mongoose.model("DateOverride", dateOverrideSchema);
export default DateOverride;
