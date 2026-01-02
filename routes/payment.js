// routes/payment.js
import express from "express";
import Stripe from "stripe";
import SERVICES from "../services.js"; // Step 2

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create Stripe Checkout Session
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { email, category, formName } = req.body;

    // ONE Online Prescription price
    const service = SERVICES.ONLINE_PRESCRIPTION;
    if (!service) return res.status(400).json({ error: "Service not found" });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          price: service.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        category, // e.g., Travel Health
        formName, // e.g., Jet Lag
      },
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create Stripe session" });
  }
});

export default router;
