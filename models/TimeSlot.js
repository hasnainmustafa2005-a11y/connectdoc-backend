import mongoose from "mongoose";

const historyItem = {
  oldCapacity: Number,
  newCapacity: Number,
  reason: String,
  overrideDate: String,
  changedAt: Date,
};

const timeSlotSchema = new mongoose.Schema({
  date: {              // YYYY-MM-DD
    type: String,
    required: true,
    index: true,
  },
  time: {              // HH:MM
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ["normal", "special"],
    default: "normal",
  },
  overrideReason: String, // short reason for special slots
  isVisible: {
    type: Boolean,
    default: true,
  },
  capacity: {
    type: Number,
    required: true,
  },
  remaining: {
    type: Number,
    required: true,
  },
  history: [historyItem],
}, {
  timestamps: true,
});

timeSlotSchema.index({ date: 1, time: 1 }, { unique: true });

export default mongoose.model("TimeSlot", timeSlotSchema);
