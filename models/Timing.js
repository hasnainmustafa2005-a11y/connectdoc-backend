// models/Timing.js
import mongoose from "mongoose";

const timingSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    required: true,
  },
  startTime: {
    type: String, // "HH:mm"
    required: true,
  },
  endTime: {
    type: String, // "HH:mm"
    required: true,
  },
});

export default mongoose.model("Timing", timingSchema);
