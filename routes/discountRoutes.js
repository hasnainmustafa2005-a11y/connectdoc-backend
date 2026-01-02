// backend/routes/discountRoutes.js
import express from "express";
import Discount from "../models/Discount.js";

const router = express.Router();

// Get current discount (frontend will call this)
router.get("/", async (req, res) => {
  try {
    const discount = await Discount.findOne().sort({ updatedAt: -1 });
    res.json({ success: true, discount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin updates discount
router.post("/", async (req, res) => {
  try {
    const { text, isActive } = req.body;
    let discount = await Discount.findOne();
    if (discount) {
      discount.text = text;
      discount.isActive = isActive;
      await discount.save();
    } else {
      discount = await Discount.create({ text, isActive });
    }
    res.json({ success: true, discount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
