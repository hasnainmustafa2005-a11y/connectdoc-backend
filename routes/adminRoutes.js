// routes/adminRoutes.js
import express from "express";
import { verifyAdmin } from "../middleware/authadminMiddleware.js";
import { registerAdmin, loginAdmin, verifyAdminOTP, } from "../controllers/adminController.js";
import { logoutAdmin } from "../controllers/adminController.js";
import * as AdminsController from "../controllers/adminsController.js";

const router = express.Router();

router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.post("/verify-otp", verifyAdminOTP);
router.post("/send-otp", verifyAdmin, AdminsController.sendOtp);
router.post("/logout", verifyAdmin, logoutAdmin);
router.post("/reset-doctor-password", verifyAdmin, AdminsController.resetDoctorPassword);
router.get("/all-doctors", verifyAdmin, AdminsController.getAllDoctors);
export default router;
