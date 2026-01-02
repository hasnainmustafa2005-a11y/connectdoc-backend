import express from "express";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";

const router = express.Router();

router.get("/doctor/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const doctor = await Doctor.findOne({ email });
    if (!doctor)
      return res.status(404).json({ success: false, message: "Doctor not found" });

    const appointments = await Appointment.find({ doctor: doctor._id })
      .populate("doctor", "name email specialization")
      .sort({ date: 1, time: 1 });

    res.json({ success: true, appointments });
  } catch (error) {
    console.error("❌ Error fetching doctor appointments:", error.message);
    res.status(500).json({ success: false, message: "Error fetching doctor appointments" });
  }
});

router.post("/book", async (req, res) => {
  try {
    const { patientName, patientEmail, service, date, time } = req.body;

    // 1️⃣ Find doctors who are available at this time
    const availableDoctors = await Doctor.find({
      availabilityRanges: {
        $elemMatch: { from: { $lte: time }, to: { $gte: time } },
      },
    });

    if (availableDoctors.length === 0) {
      return res.status(400).json({ message: "No doctors available at this time" });
    }

    // 2️⃣ Pick one available doctor (simple random assignment)
    const randomDoctor = availableDoctors[Math.floor(Math.random() * availableDoctors.length)];

    // 3️⃣ Create appointment
    const appointment = new Appointment({
      patientName,
      patientEmail,
      service,
      date,
      time,
      doctor: randomDoctor._id,
    });

    await appointment.save();

    res.status(201).json({
      message: `Appointment booked with ${randomDoctor.name}`,
      appointment,
    });
  } catch (error) {
    console.error("Error booking appointment:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
