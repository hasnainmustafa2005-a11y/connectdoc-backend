import express from "express";
import WeeklySchedule from "../models/WeeklySchedule.js";

const router = express.Router();

// GET all weekly schedules
router.get("/", async (req, res) => {
  try {
    const schedules = await WeeklySchedule.find().sort({ day: 1 });
    res.json({ success: true, schedules });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch schedules" });
  }
});

// POST create or update a day schedule
router.post("/", async (req, res) => {
  try {
    const { day, startTime, endTime, slotDuration } = req.body;
    if (!day || !startTime || !endTime || !slotDuration)
      return res.status(400).json({ success: false, message: "All fields are required" });

    const existing = await WeeklySchedule.findOne({ day });
    if (existing) {
      existing.startTime = startTime;
      existing.endTime = endTime;
      existing.slotDuration = slotDuration;
      await existing.save();
      return res.json({ success: true, message: "Schedule updated", schedule: existing });
    }

    const schedule = await WeeklySchedule.create({ day, startTime, endTime, slotDuration });
    res.json({ success: true, message: "Schedule created", schedule });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// DELETE a schedule
router.delete("/:id", async (req, res) => {
  try {
    await WeeklySchedule.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Schedule deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
