// GET /api/doctors/count
import Doctor from "../models/Doctor.js";

export const getDoctorCount = async (req, res) => {
  try {
    const count = await Doctor.countDocuments();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: "Failed to get doctor count" });
  }
};
