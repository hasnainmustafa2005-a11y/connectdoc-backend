import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  question: String,
  answer: String,
});

const formSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },

    dob: { type: Date, required: true },
    address: { type: String, required: true },
    age: { type: Number },

    category: String,
    subCategory: String,

    questions: [questionSchema],

    // 🔐 Stripe-related fields
    stripeSessionId: { type: String },
    stripePaymentIntentId: { type: String },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    openedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "Doctor" }],


    // ✅ keep email history
    sentDoctors: { type: [String], default: [] },

    // ✅ NEW (for doctor dashboard)
    assignedDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      default: null,
    },

    assignedAt: { type: Date },
  },
  { timestamps: true }
);

const Form = mongoose.model("Form", formSchema);
export default Form;
