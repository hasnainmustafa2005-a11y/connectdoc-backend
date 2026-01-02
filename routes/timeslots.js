import express from "express";
import TimeSlot from "../models/TimeSlot.js";
import TimeSlotSpecialHistory from "../models/TimeSlotSpecialHistory.js";
import CapacityOverrideHistory from "../models/CapacityOverrideHistory.js";
import Doctor from "../models/Doctor.js";
import Override from "../models/Override.js";

const router = express.Router();

// helpers
const timeToMinutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const minutesToTime = (m) => {
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
};

// ==================================================================
// Generate normal availability across a date range (weekday/weekend)
router.post("/generate-availability", async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      interval,
      capacity,
      weeklySchedule,
    } = req.body;

    // ✅ Basic validation
    if (!startDate || !endDate || !interval) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!weeklySchedule || typeof weeklySchedule !== "object") {
      return res.status(400).json({ message: "weeklySchedule is required" });
    }

    const hasValidDay = Object.values(weeklySchedule).some(
      d => d && d.start && d.end
    );

    if (!hasValidDay) {
      return res.status(400).json({
        message: "At least one day must have start and end time",
      });
    }

    // ✅ capacity logic
    const doctorCount = await Doctor.countDocuments();
    const cap = capacity ?? doctorCount ?? 1;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const generated = [];

    // ✅ day map
    const dayMap = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayName = dayMap[d.getDay()];
      const config = weeklySchedule[dayName];
      if (!config) continue;

      const dateStr = d.toISOString().split("T")[0];
      let cur = timeToMinutes(config.start);
      const limit = timeToMinutes(config.end);

      while (cur < limit) {
        generated.push({
          date: dateStr,
          time: minutesToTime(cur),
          type: "normal",
          capacity: cap,
          remaining: cap,
          isVisible: true,
        });
        cur += Number(interval);
      }
    }

    // ✅ dedupe
    const unique = new Map();
    generated.forEach(s => {
      unique.set(`${s.date}-${s.time}`, s);
    });
    const deduped = [...unique.values()];

    // ✅ remove existing slots
    const existing = await TimeSlot.find(
      { date: { $gte: startDate, $lte: endDate } },
      { date: 1, time: 1 }
    );
    const existingKeys = new Set(existing.map(x => `${x.date}-${x.time}`));
    const toInsert = deduped.filter(
      s => !existingKeys.has(`${s.date}-${s.time}`)
    );

    if (!toInsert.length) {
      return res.json({ success: true, totalGenerated: 0, slots: [] });
    }

    const created = await TimeSlot.insertMany(toInsert);

    // ✅ socket emit
    const io = req.app.get("io");
    io?.emit("slot-created", created);

    res.json({
      success: true,
      totalGenerated: created.length,
      slots: created,
    });
  } catch (err) {
    console.error("generate-availability error:", err);
    res.status(500).json({ message: "Failed generating availability" });
  }
});


// ==================================================================
// Generate special slots for a single date (admin provided), log history
router.post("/generate-special", async (req, res) => {
  try {
    const { date, timeStart, timeEnd, interval, capacity, reason, createdBy } = req.body;
    if (!date || !timeStart || !timeEnd || !interval || !capacity || !reason) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const sMin = timeToMinutes(timeStart);
    const eMin = timeToMinutes(timeEnd);
    if (sMin >= eMin) return res.status(400).json({ message: "start must be before end" });

    const slots = [];
    for (let cur = sMin; cur < eMin; cur += Number(interval)) {
      slots.push({
        date,
        time: minutesToTime(cur),
        type: "special",
        overrideReason: reason,
        capacity: Number(capacity),
        remaining: Number(capacity),
        isVisible: true,
      });
    }

    // dedupe against DB existing for that date
    const existing = await TimeSlot.find({ date }, { date: 1, time: 1 });
    const existKeys = new Set(existing.map(x => `${x.date}-${x.time}`));
    const toInsert = slots.filter(s => !existKeys.has(`${s.date}-${s.time}`));

    const created = toInsert.length ? await TimeSlot.insertMany(toInsert) : [];

    // record history entry (always store the admin action)
    await TimeSlotSpecialHistory.create({
      date,
      start: timeStart,
      end: timeEnd,
      interval: Number(interval),
      capacity: Number(capacity),
      reason,
      createdBy,
    });

    const io = req.app.get("io");
    io?.emit("slot-created", created);

    res.json({ success: true, totalGenerated: created.length, slots: created });
  } catch (err) {
    console.error("generate-special error:", err);
    res.status(500).json({ message: "Failed to generate special slots" });
  }
});


// ==================================================================
// Manually update capacity of a slot (admin)
// ==================================================================
router.put("/update-capacity/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { newCapacity, reason, updatedBy } = req.body;

    if (!newCapacity || newCapacity < 1) {
      return res.status(400).json({ message: "Invalid new capacity" });
    }

    const slot = await TimeSlot.findById(id);
    if (!slot) return res.status(404).json({ message: "Slot not found" });

    const oldCapacity = slot.capacity;

    // If remaining should adjust logically:
    const alreadyBooked = oldCapacity - slot.remaining;
    const updatedRemaining = newCapacity - alreadyBooked;

    if (updatedRemaining < 0) {
      return res.status(400).json({
        message: "New capacity cannot be less than the number of already booked appointments",
      });
    }

    // Update slot
    slot.capacity = newCapacity;
    slot.remaining = updatedRemaining;
    await slot.save();

    // Save capacity override history
    await CapacityOverrideHistory.create({
      slotDate: slot.date,
      slotTime: slot.time,
      oldCapacity,
      newCapacity,
      reason,
      updatedBy,
      type: "single",
    });

    // Emit socket event
    const io = req.app.get("io");
    io?.emit("slot-capacity-updated", {
      slotId: slot._id,
      date: slot.date,
      time: slot.time,
      oldCapacity,
      newCapacity,
      remaining: updatedRemaining,
    });

    res.json({
      success: true,
      message: "Capacity updated successfully",
      slot,
    });

  } catch (err) {
    console.error("update-capacity error:", err);
    res.status(500).json({ message: "Failed to update capacity" });
  }
});


// ==================================================================
// Fetch all slots (admin)
router.get("/all", async (req, res) => {
  try {
    const slots = await TimeSlot.find().sort({ date: 1, time: 1 });
    res.json(slots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch all slots" });
  }
});

// get override history
router.post("/override-history", async (req, res) => {
  try {
    const {
      slotDate,
      slotTime,
      oldCapacity,
      newCapacity,
      reason,
      updatedBy,
    } = req.body;

    const entry = await CapacityOverrideHistory.create({
      slotDate,
      slotTime,
      oldCapacity,
      newCapacity,
      reason,
      updatedBy,
    });

    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// get override history
router.get("/override-history", async (req, res) => {
  try {
    const list = await CapacityOverrideHistory.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// ==================================================================
// Get available (user) slots from today onwards
router.get("/", async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const slots = await TimeSlot.find({
      date: { $gte: todayStr },
      isVisible: true,
      remaining: { $gt: 0 },
    }).sort({ date: 1, time: 1 });
    res.json(slots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch slots" });
  }
});

// ==================================================================
// Delete slots between two dates (inclusive)
router.delete("/range", async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) return res.status(400).json({ message: "startDate and endDate required" });

    const result = await TimeSlot.deleteMany({ date: { $gte: startDate, $lte: endDate } });
    const io = req.app.get("io");
    io?.emit("slots-deleted-range", { startDate, endDate, count: result.deletedCount });
    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete slots in range" });
  }
});
// ==================================================================
// Delete a single slot by id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await TimeSlot.findByIdAndDelete(id);
    const io = req.app.get("io");
    io?.emit("slot-deleted", id);
    res.json({ success: true, message: "Slot deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete slot" });
  }
});

// ==================================================================
// Get history of special slots (admin)

router.post("/special-history", async (req, res) => {
  try {
    const {
      date,
      start,
      end,
      interval,
      capacity,
      reason,
      createdBy,
    } = req.body;

    const entry = await TimeSlotSpecialHistory.create({
      date,
      start,
      end,
      interval,
      capacity,
      reason,
      createdBy,
    });

    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==================================================================
// Get history of special slots (admin)
router.get("/special-history", async (req, res) => {
  try {
    const list = await TimeSlotSpecialHistory.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



export default router;
