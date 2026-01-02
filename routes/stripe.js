// routes/stripe.js
import express from "express";
import Stripe from "stripe";
import Form from "../models/Form.js"; // your form schema

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ Create Checkout Session
// routes/stripe.js
// routes/stripe.js
// routes/stripe.js
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { formId } = req.body;
    if (!formId) return res.status(400).json({ error: "Form ID is required" });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: "Online Medical Consultation" },
            unit_amount: 2500, // €25
          },
          quantity: 1,
        },
      ],
      success_url: `http://localhost:5173/payment-success?sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: "http://localhost:5173/payment-cancel",
      metadata: { formId }, // ✅ important
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/webhook", async (req, res) => {
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
    console.error("Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const formId = session.metadata?.formId;

    if (!formId) {
      console.error("❌ formId missing in metadata");
      return res.json({ received: true });
    }

   await Form.findByIdAndUpdate(formId, {
  paymentStatus: "paid",
  stripePaymentIntentId: session.payment_intent || session.id, // fallback to session.id
  stripeSessionId: session.id,
});

    console.log(`✅ Payment confirmed for form ${formId}`);
  }

  res.json({ received: true });
});





router.get("/session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    // ✅ Retrieve Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Get formId from metadata
    const formId = session.metadata?.formId;
    if (!formId) return res.status(400).json({ error: "Form ID not found in session metadata" });

    // ✅ Fetch the form from DB
    const form = await Form.findById(formId);
    if (!form) return res.status(404).json({ error: "Form not found" });

    // Optional: mark as paid immediately if session is completed
    if (session.payment_status === "paid" && form.paymentStatus !== "paid") {
      form.paymentStatus = "paid";
      form.paymentId = session.payment_intent || session.id;
      await form.save();
    }

    res.json({ form });
  } catch (err) {
    console.error("Failed to fetch form by session:", err);
    res.status(500).json({ error: err.message });
  }
});


export default router; // ✅ Default export
