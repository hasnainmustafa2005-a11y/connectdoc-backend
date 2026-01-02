import express from "express";
import Stripe from "stripe";
import Form from "../models/Form.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 🚨 RAW BODY REQUIRED
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    console.log("🔥 Stripe webhook received");

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("❌ Webhook signature error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const formId = session.metadata?.formId;

      if (!formId) {
        console.error("❌ Missing formId in metadata");
        return res.json({ received: true });
      }

      await Form.findByIdAndUpdate(formId, {
        paymentStatus: "paid",
        paymentId: session.payment_intent, // pi_xxx ✅
        checkoutSessionId: session.id,     // cs_xxx (audit)
      });

      console.log(`✅ Payment marked PAID for form ${formId}`);
    }

    res.json({ received: true });
  }
);

export default router;
