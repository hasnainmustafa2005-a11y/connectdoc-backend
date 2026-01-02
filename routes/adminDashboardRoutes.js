import express from "express";
import Booking from "../models/Booking.js";
import Doctor from "../models/Doctor.js";
import { getDoctorHistory } from "../controllers/adminDoctorHistory.js";

const router = express.Router();

router.get("/dashboard-stats", async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const pending = await Booking.countDocuments({ status: "Pending" });
    const completed = await Booking.countDocuments({ status: "Completed" });
    const doctors = await Doctor.countDocuments({ status: "Active" });

    const recentBookings = await Booking.find().sort({ createdAt: -1 }).limit(5);

    const trend = await Booking.aggregate([
      {
        $group: {
          _id: "$date",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const services = await Booking.aggregate([
      {
        $group: {
          _id: "$service",
          value: { $sum: 1 },
        },
      },
      { $project: { name: "$_id", value: 1, _id: 0 } },
    ]);

    res.json({
      stats: { totalBookings, pending, completed, doctors },
      recentBookings,
      trend: trend.map((t) => ({ date: t._id, count: t.count })),
      services,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching stats", error });
  }
});

router.get("/doctor-history/:doctorId", getDoctorHistory);

export default router;
