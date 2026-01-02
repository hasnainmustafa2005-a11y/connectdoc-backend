// models/Booking.js
import mongoose from "mongoose";
const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: false },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    phone: { type: String, required: true },
    dob: { type: String, required: true },
      address: {
      type: String,
      required: true, // or false if optional
      trim: true,
    },
    service: { type: String, required: true },
    time: { type: String, required: true },
    date: { type: String, required: true },
    formData: { type: Object, default: {} },
    paymentStatus: { type: String, default: "Pending" },
    paymentId: { type: String },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Canceled"],
      default: "Pending",
    },
    completedAt: { type: Date, default: null }, // new field
    assignedAutomatically: { type: Boolean, default: false },
    manuallyAssigned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
