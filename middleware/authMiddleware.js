import jwt from "jsonwebtoken";
import Doctor from "../models/Doctor.js";

export const protect = async (req, res, next) => {
  let token;

  // 🔍 Check if Authorization header exists and starts with "Bearer"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1]; // Extract token

      // 🔑 Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 🧠 Attach doctor data (excluding password)
      req.doctor = await Doctor.findById(decoded.id).select("-password");

      next(); // ✅ Continue to next middleware/route
    } catch (error) {
      console.error("❌ Token verification failed:", error.message);
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
  }

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No token, authorization denied" });
  }
};
