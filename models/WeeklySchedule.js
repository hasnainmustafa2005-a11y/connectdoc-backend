import mongoose from "mongoose";

const weeklyScheduleSchema = new mongoose.Schema({
  day: { type: String, required: true }, // "Monday", "Tuesday", ...
  startTime: { type: String, required: true }, // "18:00"
  endTime: { type: String, required: true },   // "22:00"
  slotDuration: { type: Number, required: true }, // minutes: 15,30,45,60
});

export default mongoose.model("WeeklySchedule", weeklyScheduleSchema);
