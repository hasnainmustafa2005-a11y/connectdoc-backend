// server.js
import express from "express";
import mongoose from "mongoose";
import http from "http";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import cron from "node-cron";
import { DateTime } from "luxon";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

// Models
import TimeSlot from "./models/TimeSlot.js";

// Routes
import formRoutes from "./routes/formRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import timeslotRoutes from "./routes/timeslots.js";
import adminDashboardRoutes from "./routes/adminDashboardRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";
import servicePriceRoutes from "./routes/servicePriceRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";
import discountRoutes from "./routes/discountRoutes.js";
import adminDoctorRoutes from "./routes/adminDoctorRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import dateOverrideRoutes from "./routes/dateOverrideRoutes.js";
import timingsRouter from "./routes/timings.js";
import stripeRoutes from "./routes/stripe.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import refundRoutes from "./routes/refundRoutes.js";

dotenv.config();
const app = express();

// ✅ CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",      // local frontend     // optional (if ever used)
    ],
    credentials: true,
  })
);

// ✅ Log all requests
app.use((req, res, next) => {
  console.log("➡️", req.method, req.url);
  next();
});

// ✅ Stripe webhook must come BEFORE bodyParser.json
app.use(
  "/api/payment/webhook",
  express.raw({ type: "application/json" })
);

// ✅ Body parser for all other JSON requests
app.use(bodyParser.json({ limit: "10mb" }));

// ✅ Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Atlas connected"))
  .catch((err) => console.error("❌ MongoDB connection failed:", err));

// ✅ Cron job to delete expired timeslots daily
cron.schedule(
  "0 0 * * *",
  async () => {
    try {
      const todayStr = DateTime.now().setZone("Europe/Dublin").toISODate();
      const result = await TimeSlot.deleteMany({ date: { $lt: todayStr } });

      if (result.deletedCount > 0) {
        console.log(`🗑 Deleted ${result.deletedCount} expired time slots`);
        const io = app.get("io");
        io?.emit("expired-slots-deleted", {
          date: todayStr,
          deleted: result.deletedCount,
        });
      } else {
        console.log("No expired slots to delete today");
      }
    } catch (err) {
      console.error("❌ Cron Error:", err);
    }
  },
  { timezone: "Europe/Dublin" }
);

// ✅ HTTP server + Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT"],
  },
});
app.set("io", io);

// ✅ Track connected doctors for real-time updates
const connectedDoctors = new Map();
io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("registerDoctor", (doctorId) => {
    connectedDoctors.set(doctorId, socket.id);
    console.log(`👨‍⚕️ Doctor ${doctorId} registered with socket ${socket.id}`);
  });

  socket.on("adminUpdatedSlot", (updatedSlot) => {
    io.emit("timeslotUpdated", updatedSlot);
  });

  socket.on("adminAddedSlot", (newSlot) => {
    io.emit("timeslotAdded", newSlot);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
    for (const [doctorId, id] of connectedDoctors.entries()) {
      if (id === socket.id) {
        connectedDoctors.delete(doctorId);
        console.log(`🗑️ Removed doctor ${doctorId} from online list`);
      }
    }
  });
});

// ✅ Notify a doctor about new booking
export const notifyDoctor = (doctorId, booking) => {
  const doctorSocketId = connectedDoctors.get(doctorId);
  if (doctorSocketId) {
    io.to(doctorSocketId).emit("newBooking", booking);
    console.log(`📨 Sent new booking to doctor ${doctorId}`);
  } else {
    console.log(`⚠️ Doctor ${doctorId} not online`);
  }
};

// ✅ Routes
app.use("/api", formRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/timeslots", timeslotRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminDashboardRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/service-prices", servicePriceRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/discount", discountRoutes);
app.use("/uploads", express.static(path.join(fileURLToPath(import.meta.url), "uploads")));
app.use("/api/doctor-analytics", adminDoctorRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/date-overrides", dateOverrideRoutes);
app.use("/api/timings", timingsRouter);
app.use("/api/stripe", stripeRoutes);
app.use("/api/payment", paymentRoutes); // ✅ webhook inside paymentRoutes
app.use("/api/refunds", refundRoutes);

// ✅ Health check
app.get("/", (req, res) => res.send("🚀 ConnectDoc Backend Running..."));

// ✅ Start server
// ✅ Start server
const PORT = process.env.PORT || 5000;

// Bind to 0.0.0.0 for Clever Cloud
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

