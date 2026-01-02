import mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    paymentId: {
      type: String,
      required: true
    },
    refundDate: {
      type: Date,
      required: true
    },
    reason: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Refund", refundSchema);
