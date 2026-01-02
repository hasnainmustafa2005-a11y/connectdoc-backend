import mongoose from "mongoose";
import Doctor from "./models/Doctor.js"; // adjust path if needed
import dotenv from "dotenv";

dotenv.config();

const BACKEND_URL = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/my-doctor-app";

mongoose.connect(BACKEND_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.error(err));

async function fixStatusHistory() {
  try {
    const doctors = await Doctor.find();

    for (let doc of doctors) {
      let updated = false;

      if (doc.statusHistory && doc.statusHistory.length > 0) {
        doc.statusHistory.forEach(h => {
          if (!h.startDate) {
            h.startDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
            updated = true;
          }
          if (!h.endDate) {
            h.endDate = new Date().toISOString().split("T")[0];
            updated = true;
          }
        });
      }

      if (updated) {
        await doc.save();
        console.log(`Fixed statusHistory for doctor: ${doc.name}`);
      }
    }

    console.log("All doctors fixed!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixStatusHistory();
