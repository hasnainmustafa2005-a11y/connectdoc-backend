import mongoose from "mongoose";

/* ------------------- Weekly Availability ------------------- */
const availabilitySchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      required: true,
    },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  { _id: false }
);

/* ------------------- Monthly Availability ------------------- */
const monthlyAvailabilitySchema = new mongoose.Schema(
  {
    month: { type: Number, min: 1, max: 12, required: true },
    year: { type: Number, required: true },
    days: [
      {
        date: { type: Date, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        isAvailable: { type: Boolean, default: true },
      },
    ],
  },
  { _id: false }
);

/* ------------------- Status History ------------------- */
const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ["Active", "Inactive"], required: true },
    reason: { type: String, required: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/* ------------------- Doctor Schema ------------------- */
const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    phone: { type: String, default: "" },
    password: { type: String, required: true },

    specialization: { type: String, default: "" },
    experience: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    // 🔐 OTP fields (temporary)
    otp: { type: String },
    otpExpiry: { type: Date },

    availability: [availabilitySchema],
    monthlyAvailability: [monthlyAvailabilitySchema],
    statusHistory: [statusHistorySchema],
  },
  { timestamps: true }
);

const Doctor = mongoose.model("Doctor", doctorSchema);
export default Doctor;
