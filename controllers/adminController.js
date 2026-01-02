import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import otpStore from "../utils/otpStore.js";
import sendEmails from "../utils/sendEmails.js";
import AdminActivity from "../models/AdminActivity.js";

// Generate OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ================= REGISTER =================
export const registerAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin)
      return res.status(400).json({ success: false, message: "Admin already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = new Admin({ email, password: hashedPassword });
    await admin.save();

    res.status(201).json({ success: true, message: "Admin registered successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ================= LOGIN STEP 1 (SEND OTP) =================
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin)
      return res.status(404).json({ success: false, message: "Admin not found" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch)
      return res.status(400).json({ success: false, message: "Invalid password" });

    const otp = generateOTP();

    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    await sendEmails(
      email,
      "Admin Login OTP",
      `Your OTP is ${otp}. It will expire in 5 minutes.`
    );

    res.json({
      success: true,
      message: "OTP sent to email",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ================= LOGIN STEP 2 (VERIFY OTP) =================
export const verifyAdminOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const storedOTP = otpStore.get(email);

    if (!storedOTP)
      return res.status(400).json({ success: false, message: "OTP not found or expired" });

    if (storedOTP.expiresAt < Date.now()) {
      otpStore.delete(email);
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (storedOTP.otp !== otp)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    otpStore.delete(email);

    const admin = await Admin.findOne({ email });

    const token = jwt.sign(
      { id: admin._id },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      token,
      message: "Login successful",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const logoutAdmin = async (req, res) => {
  try {
    await AdminActivity.create({
      adminId: req.admin.id,
      action: "LOGOUT",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


