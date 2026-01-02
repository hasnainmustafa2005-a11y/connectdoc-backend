// import mongoose from "mongoose";

// const overrideSchema = new mongoose.Schema({
//   type: { type: String, enum: ["single", "date"], required: true },
//   slotId: { type: mongoose.Schema.Types.ObjectId, ref: "TimeSlot" },
//   date: { type: String }, // YYYY-MM-DD for date-type override
//   oldCapacity: Number,
//   newCapacity: Number,
//   updatedBy: { type: String },
//   reason: { type: String },
// }, { timestamps: true });

// export default mongoose.model("CapacityOverrideHistory", overrideSchema);

// models/CapacityOverrideHistory.js

import mongoose from "mongoose";

const capacityOverrideHistorySchema = new mongoose.Schema(
  {
    slotDate: { type: String, required: true },      // YYYY-MM-DD
    slotTime: { type: String, required: true },      // "09:00"
    oldCapacity: { type: Number, required: true },
    newCapacity: { type: Number, required: true },
    reason: { type: String, default: "-" },
    updatedBy: { type: String, default: "Admin" },
  },
  { timestamps: true }
);

export default mongoose.model(
  "CapacityOverrideHistory",
  capacityOverrideHistorySchema
);
