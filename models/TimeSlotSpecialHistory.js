

// models/TimeSlotSpecialHistory.js

import mongoose from "mongoose";

const timeSlotSpecialHistorySchema = new mongoose.Schema(
  {
    date: { type: String, required: true },         // YYYY-MM-DD
    start: { type: String, required: true },        // "09:00"
    end: { type: String, required: true },          // "11:00"
    interval: { type: Number, required: true },
    capacity: { type: Number, required: true },
    reason: { type: String, default: "-" },
    createdBy: { type: String, default: "Admin" },
  },
  { timestamps: true }
);

export default mongoose.model(
  "TimeSlotSpecialHistory",
  timeSlotSpecialHistorySchema
);
