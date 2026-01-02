// backend/models/Discount.js
import mongoose from "mongoose";

const DiscountSchema = new mongoose.Schema({
  text: { type: String, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model("Discount", DiscountSchema);
