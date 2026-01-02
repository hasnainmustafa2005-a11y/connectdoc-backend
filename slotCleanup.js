// utils/slotCleanup.js
import cron from "node-cron";
import TimeSlot from "../models/TimeSlot.js";
import app from "../app.js"; // your express app

// Function to delete expired slots based on Ireland timezone
export const deleteExpiredSlots = async () => {
  try {
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });

    const result = await TimeSlot.deleteMany({
      date: { $lt: todayStr }
    });

    if (result.deletedCount > 0) {
      console.log(`🗑 Deleted ${result.deletedCount} expired slots before ${todayStr}`);

      // Emit socket event if needed
      const io = app.get("io");
      io?.emit("expired-slots-deleted", {
        date: todayStr,
        deleted: result.deletedCount
      });
    } else {
      console.log(`No expired slots to delete before ${todayStr}`);
    }
  } catch (error) {
    console.error("❌ Error deleting expired slots:", error);
  }
};

// --- Run once immediately when server starts ---
deleteExpiredSlots();

// --- Schedule cron job for daily deletion at 12:00 AM Ireland time ---
cron.schedule(
  "0 0 * * *",
  () => {
    console.log("🕛 Running daily expired slot cleanup cron job");
    deleteExpiredSlots();
  },
  {
    timezone: "Europe/Dublin"
  }
);
