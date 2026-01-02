import express from "express";
import bcrypt from "bcryptjs";
import Doctor from "../models/Doctor.js";
import Booking from "../models/Booking.js";
import nodemailer from "nodemailer";
import sendOtpEmail from "../utils/sendOtpEmail.js";
import LogoutLog from "../models/LogoutLog.js";
import Form from "../models/Form.js";

import { generateDoctorToken, verifyDoctorToken } from "../middleware/authDoctor.js";
import { getDoctorCount } from "../controllers/doctorController.js";
// import DateOverride from "../models/DateOverride.js";


const router = express.Router();

/* ➕ REGISTER NEW DOCTOR */
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, specialization, experience, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required." });
    }

    const existingDoctor = await Doctor.findOne({ email: email.toLowerCase() });
    if (existingDoctor)
      return res.status(400).json({ success: false, message: "Email already registered." });

    const hashedPassword = await bcrypt.hash(password, 12);

    const doctor = new Doctor({
      name,
      email: email.toLowerCase(),
      phone,
      specialization,
      experience,
      password: hashedPassword,
      availability: [],
      monthlyAvailability: [],
      status: "Active",
    });

    const savedDoctor = await doctor.save();
    const token = generateDoctorToken(savedDoctor);

    res.status(201).json({
      success: true,
      message: "Doctor registered successfully.",
      doctor: {
        _id: savedDoctor._id,
        name: savedDoctor.name,
        email: savedDoctor.email,
        phone: savedDoctor.phone,
        specialization: savedDoctor.specialization,
        experience: savedDoctor.experience,
        availability: savedDoctor.availability,
        monthlyAvailability: savedDoctor.monthlyAvailability,
        status: savedDoctor.status,
      },
      token,
    });
  } catch (error) {
    console.error("❌ Error registering doctor:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

router.get("/count", getDoctorCount);
/* 🔐 DOCTOR LOGIN */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const doctor = await Doctor.findOne({ email: email.toLowerCase() });
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });

    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Doctor.updateOne(
      { _id: doctor._id },
      {
        otp,
        otpExpiry: Date.now() + 2 * 60 * 1000,
      }
    );

    await sendOtpEmail(doctor.email, otp);

    res.json({
      success: true,
      requiresOtp: true,
      doctorId: doctor._id,
      message: "OTP sent to email",
    });

  } catch (err) {
    console.error("❌ LOGIN ERROR:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
router.post("/verify-otp", async (req, res) => {
  try {
    const { doctorId, otp } = req.body;

    // ✅ Input validation
    if (!doctorId || !otp) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID and OTP are required",
      });
    }

    // Find doctor by ID
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Check if OTP exists
    if (!doctor.otp || !doctor.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: "OTP not requested",
      });
    }

    // Verify OTP
    if (doctor.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Check OTP expiry
    if (doctor.otpExpiry < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    // ✅ Clear OTP without triggering full schema validation
    await Doctor.updateOne(
      { _id: doctor._id },
      { $set: { otp: null, otpExpiry: null } }
    );

    // Generate JWT token
    const token = generateDoctorToken(doctor); // your existing JWT helper

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      token,
    });
  } catch (error) {
    console.error("❌ OTP VERIFY ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// ---------- RESEND OTP ----------
router.post("/resend-otp", async (req, res) => {
  try {
    const { doctorId } = req.body;

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID is required",
      });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Generate a new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    doctor.otp = otp;
    doctor.otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes
    await doctor.save();

    // Send OTP via email
    await sendOtpEmail(doctor.email, otp); // reuse your nodemailer helper

    res.status(200).json({
      success: true,
      message: "OTP resent successfully",
    });
  } catch (error) {
    console.error("❌ RESEND OTP ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});


/* 📋 GET ALL DOCTORS (Admin) */
router.get("/all", async (req, res) => {
  try {
    const doctors = await Doctor.find().sort({ createdAt: -1 }).select("-password");
    res.json({ success: true, doctors });
  } catch (error) {
    console.error("❌ Error fetching doctors:", error);
    res.status(500).json({ success: false, message: "Error fetching doctors." });
  }
});

/* 🩺 GET BOOKINGS FOR LOGGED-IN DOCTOR */
router.get("/me/bookings", verifyDoctorToken, async (req, res) => {
  try {
    const doctorId = req.doctor.doctorId;
    const bookings = await Booking.find({ doctorId })
      .populate("doctorId", "name email specialization")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    console.error("❌ Error fetching doctor bookings:", error);
    res.status(500).json({ success: false, message: "Error fetching bookings." });
  }
});

/* 🩺 ADMIN: GET BOOKINGS BY DOCTOR ID */
router.get("/:doctorId/bookings", async (req, res) => {
  try {
    const { doctorId } = req.params;
    const bookings = await Booking.find({ doctorId })
      .populate("doctorId", "name email specialization")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    console.error("❌ Error fetching doctor bookings:", error);
    res.status(500).json({ success: false, message: "Error fetching doctor bookings." });
  }
});

/* 🕒 UPDATE WEEKLY AVAILABILITY (Admin) */
router.patch("/:id/availability", async (req, res) => {
  try {
    const { id } = req.params;
    const { availability } = req.body;

    if (!Array.isArray(availability)) {
      return res.status(400).json({ success: false, message: "Availability must be an array." });
    }

    const updatedDoctor = await Doctor.findByIdAndUpdate(
      id,
      { availability },
      { new: true }
    ).select("-password");

    if (!updatedDoctor)
      return res.status(404).json({ success: false, message: "Doctor not found." });

    res.json({
      success: true,
      message: "Weekly availability updated successfully.",
      doctor: updatedDoctor,
    });
  } catch (error) {
    console.error("❌ Error saving availability:", error);
    res.status(500).json({ success: false, message: "Server error updating availability." });
  }
});

/* 🗓️ SET MONTHLY AVAILABILITY (Admin) */
router.patch("/:id/monthly-availability", async (req, res) => {
  try {
    const { id } = req.params;
    const { year, month, startTime, endTime } = req.body;

    if (!year || !month || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Year, month, startTime, and endTime are required",
      });
    }

    const doctor = await Doctor.findById(id);
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });

    // Generate all days in month
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysArray = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      daysArray.push({ date, startTime, endTime, isAvailable: true });
    }

    // Check if month already exists
    const existingIndex = doctor.monthlyAvailability.findIndex(m => m.year === year && m.month === month);

    if (existingIndex !== -1) {
      doctor.monthlyAvailability[existingIndex].days = daysArray;
    } else {
      doctor.monthlyAvailability.push({ year, month, days: daysArray });
    }

    await doctor.save();

    res.json({
      success: true,
      message: `Monthly availability for ${month}/${year} updated successfully`,
      monthlyAvailability: doctor.monthlyAvailability,
    });
  } catch (error) {
    console.error("❌ Error setting monthly availability:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/date-override", async (req, res) => {
  try {
    const { date, doctorId, startTime, endTime, reason } = req.body;

    if (!date || !startTime || !endTime)
      return res.status(400).json({ message: "Date, startTime, and endTime are required" });

    // Check if an override already exists for this date + doctor
    const existing = await DateOverride.findOne({ date, doctorId: doctorId || null });

    if (existing) {
      existing.startTime = startTime;
      existing.endTime = endTime;
      existing.reason = reason || "Admin override";
      await existing.save();
      return res.json({ message: "Date override updated", override: existing });
    }

    const newOverride = await DateOverride.create({
      date,
      doctorId: doctorId || null,
      startTime,
      endTime,
      reason: reason || "Admin override",
    });

    res.json({ message: "Date override created", override: newOverride });
  } catch (err) {
    console.error("Date override error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



// router.get("/date-overrides", async (req, res) => {
//   try {
//     const { doctorId, startDate, endDate } = req.query;

//     // Build query
//     const query = {};

//     if (doctorId) query.doctorId = doctorId; // filter by doctor
//     if (startDate && endDate) {
//       query.date = { $gte: startDate, $lte: endDate }; // filter by date range
//     } else if (startDate) {
//       query.date = { $gte: startDate };
//     } else if (endDate) {
//       query.date = { $lte: endDate };
//     }

//     const overrides = await DateOverride.find(query)
//       .sort({ date: 1 })  // earliest date first
//       .populate("doctorId", "name email specialization"); // populate doctor info

//     res.json({ success: true, count: overrides.length, overrides });
//   } catch (err) {
//     console.error("Fetch date overrides error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

/* ✅ PATCH: Update Doctor Status (Active / Inactive) */
router.put("/status/:id", async (req, res) => {
  try {
    const { status, reason, fromDate, toDate } = req.body;
    if (!status) return res.status(400).json({ message: "Status is required" });
    if (!fromDate) return res.status(400).json({ message: "'fromDate' is required" });

    const historyEntry = {
      status,
      reason: reason || "Status updated",
      fromDate: new Date(fromDate),
      toDate: toDate ? new Date(toDate) : null,
      changedAt: new Date()
    };

    const updatedDoctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { $push: { statusHistory: historyEntry } },
      { new: true, runValidators: true }
    );

    if (!updatedDoctor) return res.status(404).json({ message: "Doctor not found" });

    res.json({ success: true, message: "Doctor status updated successfully", doctor: updatedDoctor });
  } catch (error) {
    console.error("❌ Error updating doctor status:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
});

router.put("/status/:id", async (req, res) => {
  try {
    const { status, reason, fromDate, toDate } = req.body;

    if (!status || !fromDate) {
      return res.status(400).json({ message: "Status and fromDate are required" });
    }

    // Convert dates to JS Date objects
    const from = new Date(fromDate);
    const to = toDate ? new Date(toDate) : null;

    // Create history entry
    const historyEntry = {
      status,
      reason: reason || "Status updated",
      fromDate: from,
      toDate: to,
      changedAt: new Date(),
    };

    // Push to statusHistory and optionally update main status if currently active
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { $push: { statusHistory: historyEntry } },
      { new: true, runValidators: true }
    );

    if (!updatedDoctor) return res.status(404).json({ message: "Doctor not found" });

    res.json({ message: "Doctor status updated successfully", doctor: updatedDoctor });
  } catch (error) {
    console.error("❌ Error updating doctor status:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

/* 📜 GET DOCTOR STATUS HISTORY */
router.get("/status/history/:doctorId", async (req, res) => {
  try {
    const { doctorId } = req.params;
    const doctor = await Doctor.findById(doctorId).select("name email statusHistory");
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found." });

    res.json({ success: true, history: doctor.statusHistory });
  } catch (error) {
    console.error("❌ Error fetching doctor history:", error);
    res.status(500).json({ success: false, message: "Error fetching history." });
  }
});


router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const doctor = await Doctor.findOne({ email });
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set OTP and expiry (10 min)
    await Doctor.findOneAndUpdate(
      { email },
      { otp, otpExpiry: Date.now() + 10 * 60 * 1000 },
      { runValidators: false } // Important: skip full validation
    );

    // Send OTP via email (using nodemailer)
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP for Doctor Password Reset",
      text: `Your OTP is: ${otp}. It expires in 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: "OTP sent to email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/doctors/verify-otp
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    const doctor = await Doctor.findOne({ email });
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    if (!doctor.otp || !doctor.otpExpiry)
      return res.status(400).json({ message: "OTP not generated" });

    if (Date.now() > doctor.otpExpiry)
      return res.status(400).json({ message: "OTP expired" });

    if (doctor.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    res.status(200).json({ success: true, message: "OTP verified" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/doctors/reset-password
router.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const doctor = await Doctor.findOne({ email });
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    if (!doctor.otp || !doctor.otpExpiry)
      return res.status(400).json({ message: "OTP not generated" });

    if (Date.now() > doctor.otpExpiry)
      return res.status(400).json({ message: "OTP expired" });

    if (doctor.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password & clear OTP
    await Doctor.findOneAndUpdate(
      { email },
      { password: hashedPassword, otp: null, otpExpiry: null },
      { runValidators: false }
    );

    res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * 🔓 Doctor Logout (Manual / Inactivity)
 * Logs logout activity for auditing
 */
router.post("/logout", verifyDoctorToken, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!["MANUAL", "INACTIVITY"].includes(reason)) {
      return res.status(400).json({
        success: false,
        message: "Invalid logout reason",
      });
    }

    await LogoutLog.create({
      doctor: req.doctor.doctorId, // from JWT
      reason,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({
      success: true,
      message: "Doctor logout recorded successfully",
    });
  } catch (err) {
    console.error("❌ Doctor logout error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to record logout",
    });
  }
});
router.get("/my-prescriptions", verifyDoctorToken, async (req, res) => {
  try {
    const doctorId = req.doctor.doctorId; // from JWT
    const prescriptions = await Form.find({ assignedDoctor: doctorId }).sort({ createdAt: -1 });
    res.json(prescriptions);
  } catch (err) {
    console.error("❌ Fetch doctor prescriptions error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


export default router;
