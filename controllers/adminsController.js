import Doctor from "../models/Doctor.js"; // your doctor model
import crypto from "crypto";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";

let otpStore = {};

export const sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: "Email is required" });

  const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP

  // Save OTP in memory, DB, or cache as per your choice
  // For now, we can send directly via email

  try {
    // nodemailer setup
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "OTP for Password Reset",
      text: `Your OTP is ${otp}`,
    });

    res.json({ success: true, message: "OTP sent to email", otp }); // For testing, send otp in response
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

// Reset doctor password
export const resetDoctorPassword = async (req, res) => {
  const { doctorId, newPassword } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await Doctor.findByIdAndUpdate(
      doctorId,
      { password: hashedPassword },
      { new: true, runValidators: false } // <- important, skip validating other fields
    );

    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all doctors
export const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find().select("-password");
    res.json({ success: true, doctors });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

