import express from "express";
import ServicePrice from "../models/ServicePrice.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const services = await ServicePrice.find({});
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch service prices" });
  }
});

router.patch("/:key", async (req, res) => {
  const { key } = req.params;
  const { price } = req.body;

  try {
    const service = await ServicePrice.findOne({ key });
    if (!service) return res.status(404).json({ message: "Service not found" });

    service.price = price;
    await service.save();

    // Emit to all connected clients
    const io = req.app.get("io");
    io.emit("servicePriceUpdated", { key: service.key, price: service.price });

    res.json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update price" });
  }
});

export default router;
