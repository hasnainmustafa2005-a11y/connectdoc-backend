// routes/dateOverrideRoutes.js
import express from "express";
import DateOverride from "../models/DateOverride.js"; // make sure this model exists

const router = express.Router();

// Add an override
router.post("/", async (req, res) => {
  try {
    const { doctorId, date, startTime, endTime, reason } = req.body;
    if (!doctorId || !date || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: "Required fields missing." });
    }

    const existing = await DateOverride.findOne({ doctorId, date: new Date(date) });
    if (existing) {
      // Update existing
      existing.startTime = startTime;
      existing.endTime = endTime;
      existing.reason = reason || "Admin override";
      await existing.save();
      return res.json({ success: true, override: existing });
    }

    const newOverride = new DateOverride({
      doctorId,
      date: new Date(date),
      startTime,
      endTime,
      reason: reason || "Admin override",
    });

    await newOverride.save();
    res.status(201).json({ success: true, override: newOverride });
  } catch (err) {
    console.error("Error adding override:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
// Get overrides (with optional doctorId + date range)
router.get("/", async (req, res) => {
  try {
    const { doctorId, startDate, endDate } = req.query;
    const query = {};
    if (doctorId) query.doctorId = doctorId;
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (startDate) {
      query.date = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.date = { $lte: new Date(endDate) };
    }

    const overrides = await DateOverride.find(query)
      .sort({ date: 1 })
      .populate("doctorId", "name email specialization");

    res.json({ success: true, count: overrides.length, overrides });
  } catch (err) {
    console.error("Fetch date overrides error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


export default router;
