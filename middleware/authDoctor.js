// middleware/authDoctor.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error("❌ Missing JWT_SECRET in environment variables.");
}// fallback for dev

/**
 * 🔐 Generate JWT for Doctor
 * Keeps payload minimal & token expires in 7 days
 */
export const generateDoctorToken = (doctor) => {
  try {
    return jwt.sign(
      {
        doctorId: doctor._id,
        name: doctor.name,
        email: doctor.email,
      },
      secret,
      { expiresIn: "7d" }
    );
  } catch (err) {
    console.error("❌ Error generating doctor token:", err.message);
    throw new Error("Token generation failed");
  }
};

/**
 * 🛡️ Middleware: Verify Doctor JWT
 * Protects routes that require doctor authentication
 */
export const verifyDoctorToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    // 🧩 Check if header exists and starts correctly
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided or invalid format. Please log in again.",
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token)
      return res
        .status(401)
        .json({ success: false, message: "Token missing in authorization header" });

    // 🧠 Verify token
    const decoded = jwt.verify(token, secret);
    req.doctor = decoded; // attach payload { doctorId, name, email }

    next();
  } catch (err) {
    console.error("❌ JWT Verification Error:", err.message);

    const message =
      err.name === "TokenExpiredError"
        ? "Session expired. Please log in again."
        : "Invalid or unauthorized token.";

    return res.status(401).json({ success: false, message });
  }
};
