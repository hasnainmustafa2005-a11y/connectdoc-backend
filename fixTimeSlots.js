import mongoose from "mongoose";
import TimeSlot from "./models/TimeSlot.js"; // adjust path if needed
import dotenv from "dotenv";

dotenv.config();

const fixTimeSlots = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const slots = await TimeSlot.find();

    for (const slot of slots) {
      let modified = false;

      // If capacity is missing, set to 1 (or any default value you prefer)
      if (slot.capacity === undefined || slot.capacity === null) {
        slot.capacity = 1;
        modified = true;
        console.log(`⚠️ Slot ${slot._id} missing capacity → set to 1`);
      }

      // If remaining is missing or NaN, set to capacity
      if (slot.remaining === undefined || slot.remaining === null || isNaN(slot.remaining)) {
        slot.remaining = slot.capacity;
        modified = true;
        console.log(`⚠️ Slot ${slot._id} had invalid remaining → set to capacity (${slot.capacity})`);
      }

      if (modified) await slot.save();
    }

    console.log("✅ All time slots fixed!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

fixTimeSlots();
