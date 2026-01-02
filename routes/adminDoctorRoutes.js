import express from "express";
import { getDoctorBookings } from "../controllers/adminDoctorController.js"; // correct path

const router = express.Router();

// GET bookings of a doctor with filters
router.get("/by-doctor/:doctorId", getDoctorBookings);

export default router;
