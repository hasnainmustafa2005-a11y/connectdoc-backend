import express from "express";
import Service from "../models/services.js";
const router = express.Router();

// Get all services
router.get("/", async (req, res) => {
  const services = await Service.find();
  res.json(services);
});

// Update service price (Admin Only)
router.patch("/:id/price", async (req, res) => {
  const { price } = req.body;

  try {
    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      { price },
      { new: true }
    );

    // Emit the updated service to all connected clients
    const io = req.app.get("io");
    io.emit("priceUpdated", updatedService);

    res.json(updatedService);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update price" });
  }
});

export default router;
