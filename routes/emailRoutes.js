// backend/routes/emailRoutes.js
import express from "express";
import nodemailer from "nodemailer";
import Doctor from "../models/Doctor.js"; // make sure this path is correct

const router = express.Router();

// Send PDF email (you already have this)
router.post("/send-pdf-email", async (req, res) => {
  const { doctorEmail, pdfBase64, subject, body } = req.body;
  if (!doctorEmail || !pdfBase64) return res.status(400).json({ message: "Missing required fields" });

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: doctorEmail,
      subject: subject || "Patient PDF",
      text: body || "Please find the attached PDF.",
      attachments: [
        {
          filename: `${subject || "document"}.pdf`,
          content: Buffer.from(pdfBase64.replace(/^data:application\/pdf;base64,/, ""), "base64"),
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send email", error: err.message });
  }
});

// ✅ New route to get all registered doctors
router.get("/doctors", async (req, res) => {
  try {
    const doctors = await Doctor.find().sort({ createdAt: -1 }).select("-password");
    res.json({ success: true, doctors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch doctors." });
  }
});

export default router;
