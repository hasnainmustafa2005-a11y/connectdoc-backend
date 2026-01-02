import mongoose from "mongoose";

const servicePriceSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  price: { type: String, required: true },
});

export default mongoose.model("ServicePrice", servicePriceSchema);
