import Doctor from "../models/Doctor.js";
import Booking from "../models/Booking.js";

export const getDoctorHistory = async (req, res) => {
  try {
    const { doctorId } = req.params;

    // 1. Find doctor
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // 2. Find first booking
    const firstBooking = await Booking.findOne({ doctorId })
      .sort({ createdAt: 1 })
      .limit(1);

    return res.status(200).json({
      registeredAt: doctor.createdAt,
      firstBooking: firstBooking ? firstBooking.createdAt : null,
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server Error" });
  }
};
