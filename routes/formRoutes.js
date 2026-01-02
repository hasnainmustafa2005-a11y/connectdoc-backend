import express from "express";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Form from "../models/Form.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../tempPDFs");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
router.post("/send-pdf", async (req, res) => {
  try {
    const { name, email, phone,dob,
  address,
  age, pdfBase64, category, subCategory, questions } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ success: false, message: "Missing PDF data" });
    }

    // Convert base64 to PDF buffer
    const pdfBuffer = Buffer.from(pdfBase64.split(",")[1], "base64");

    // ✅ Save form as PENDING (NOT PAID)
    const newForm = new Form({
      name,
      email,
      phone,
      dob,        // ✅ ADD
      address,   // ✅ ADD
      age, 
      category,
      subCategory,
      questions,
      paymentStatus: "pending",
      status: "Pending",
      openedBy: [],  
    });

    await newForm.save();

    // Send email to admin (still OK)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Telehealth Team" <${process.env.EMAIL_USER}>`,
      to: process.env.CLIENT_EMAIL,
      subject: `New ${subCategory || "Health"} Consultation Submitted (Pending Payment)`,
      text: `A new consultation form has been submitted.

Name: ${name}
Email: ${email}
Phone: ${phone}
Category: ${category}
Subcategory: ${subCategory}

⚠️ Payment status: PENDING
`,
      attachments: [
        {
          filename: `${subCategory || "Consultation"}-${newForm._id}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    // ✅ Return MongoDB ID (THIS is your real reference)
    // /routes/formRoutes.js - inside /send-pdf
res.json({
  success: true,
  message: "Form saved. Awaiting payment.",
  formId: newForm._id,
});

  } catch (error) {
    console.error("❌ Error in /send-pdf:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});


router.get("/forms", async (req, res) => {
  try {
    const forms = await Form.find().sort({ createdAt: -1 });
    res.json(forms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Example route to mark form as paid
// PUT /api/forms/:id/mark-paid
// GET /api/forms/:id
// router.get("/forms/:id", async (req, res) => {
//   try {
//     const form = await Form.findById(req.params.id);
//     if (!form) return res.status(404).json({ error: "Form not found" });

//     res.json(form);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// });


// GET form by ID
router.get("/forms/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ error: "Form ID is required" });

    const form = await Form.findById(id).lean();

    if (!form) return res.status(404).json({ error: "Form not found" });

    res.json({
      _id: form._id,
      name: form.name,
      email: form.email,
      phone: form.phone,
      category: form.category,
      subCategory: form.subCategory,
      questions: form.questions || [],
      paymentId: form.paymentId || "pending",
      paymentStatus: form.paymentStatus || "pending",
      createdAt: form.createdAt,
      sentDoctors: form.sentDoctors || [],
    });
  } catch (err) {
    console.error("Error fetching form:", err);
    res.status(500).json({ error: err.message });
  }
});

//
// 🔍 Route 3 — Search forms by Name, Email, or PDF ID
//
router.get("/forms/search", async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === "") {
      return res.status(400).json({ message: "Search query is required" });
    }

    const forms = await Form.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { pdfId: { $regex: query, $options: "i" } },
      ],
    }).sort({ createdAt: -1 });

    res.json(forms);
  } catch (error) {
    console.error("❌ Error searching forms:", error);
    res.status(500).json({ message: "Failed to search forms" });
  }
});
// PUT /api/forms/:id/add-doctor
router.put("/forms/:id/add-doctor", async (req, res) => {
  try {
    const { doctorName } = req.body;
    const formId = req.params.id;

    const form = await Form.findById(formId);
    if (!form) return res.status(404).json({ success: false, message: "Form not found" });

    if (!form.sentDoctors) form.sentDoctors = [];
    if (!form.sentDoctors.includes(doctorName)) form.sentDoctors.push(doctorName);

    await form.save();
    res.status(200).json({ success: true, sentDoctors: form.sentDoctors });
  } catch (err) {
    console.error("❌ Error in /forms/:id/add-doctor:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/forms/:id/add-doctor
router.put("/:id/add-doctor", async (req, res) => {
  try {
    const { doctorName } = req.body;
    if (!doctorName) return res.status(400).json({ message: "Doctor name required" });

    const form = await Form.findById(req.params.id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    // Add doctor only if not already in sentDoctors
    if (!form.sentDoctors) form.sentDoctors = [];
    if (!form.sentDoctors.includes(doctorName)) {
      form.sentDoctors.push(doctorName);
      await form.save();
    }

    res.json({ success: true, sentDoctors: form.sentDoctors });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/forms/:id — fetch single form by ID
router.get("/forms/:id", async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form) return res.status(404).json({ success: false, message: "Form not found" });
    res.json({ success: true, form });
  } catch (error) {
    console.error("❌ Error in GET /forms/:id:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.post("/:id/assign-doctor", async (req, res) => {
  try {
    const { doctorEmail } = req.body;

    if (!doctorEmail) {
      return res.status(400).json({
        success: false,
        message: "Doctor email is required",
      });
    }

    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    // prevent duplicate send
    if (form.sentDoctors.includes(doctorEmail)) {
      return res.status(400).json({
        success: false,
        message: "Doctor already assigned",
      });
    }

    form.sentDoctors.push(doctorEmail);
    await form.save();

    res.json({
      success: true,
      message: "Prescription sent to doctor",
    });
  } catch (error) {
    console.error("❌ Assign doctor error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign doctor",
    });
  }
});

// PUT /api/forms/:id/assign-doctor
// routes/formRoutes.js
router.put("/:id/assign-doctor", async (req, res) => {
  try {
    const { doctorId, doctorName } = req.body;

    if (!doctorId || !doctorName) {
      return res.status(400).json({ success: false, message: "Doctor ID and name required" });
    }

    const form = await Form.findById(req.params.id);
    if (!form) return res.status(404).json({ success: false, message: "Form not found" });

    // Prevent duplicates
    if (!form.sentDoctors) form.sentDoctors = [];
    if (!form.sentDoctors.includes(doctorId)) {
      form.sentDoctors.push(doctorId);
      form.assignedDoctor = doctorId;
      form.assignedAt = new Date();
      await form.save();
    }

    res.json({ success: true, message: "Doctor assigned successfully", form });
  } catch (err) {
    console.error("❌ Assign doctor error:", err);
    res.status(500).json({ success: false, message: "Failed to assign doctor" });
  }
});

// Mark prescription as opened
router.put("/forms/:id/mark-opened", async (req, res) => {
  try {
    const { doctorId } = req.body;
    const form = await Form.findById(req.params.id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    if (!form.openedBy) form.openedBy = [];
    if (!form.openedBy.includes(doctorId)) form.openedBy.push(doctorId);

    await form.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PUT /api/forms/:id/mark-complete
// PUT /api/forms/:id/mark-complete
router.put("/:id/mark-complete", async (req, res) => {
  try {
    const { doctorId, status } = req.body;
    const form = await Form.findById(req.params.id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    // update status and track who changed it
    form.status = status; // "Completed" or "Pending"
    if (!form.statusChangedBy) form.statusChangedBy = [];
    form.statusChangedBy.push({ doctorId, status, changedAt: new Date() });

    await form.save();

    res.json({ success: true, status: form.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PUT /api/forms/:id/toggle-status
router.put("/forms/:id/toggle-status", async (req, res) => {
  try {
    const { doctorId } = req.body;
    const form = await Form.findById(req.params.id);
    if (!form) return res.status(404).json({ success: false, message: "Form not found" });

    // Toggle status
    form.status = form.status === "Pending" ? "Completed" : "Pending";

    // Optional: track who changed it
    if (!form.openedBy) form.openedBy = [];
    if (!form.openedBy.includes(doctorId)) form.openedBy.push(doctorId);

    await form.save();

    res.json({ success: true, status: form.status });
  } catch (err) {
    console.error("❌ Toggle status error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});





export default router;
