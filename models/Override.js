// models/Override.js
import mongoose from "mongoose";

const overrideSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["date", "single"], // date-wide or single-slot override
    required: true,
  },
  date: {
    type: String, // store as "YYYY-MM-DD"
    required: true,
  },
  slotId: {
    type: mongoose.Schema.Types.ObjectId, // only for single-slot override
    ref: "TimeSlot",
    default: null,
  },
  capacity: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
    default: "Admin override",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedBy: {
    type: String, // optional, admin username or ID
    default: "admin",
  },
});

const Override = mongoose.model("Override", overrideSchema);
export default Override;
