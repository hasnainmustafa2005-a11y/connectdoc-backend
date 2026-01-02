import express from "express";
import { createCheckoutSession,stripeWebhook , getBookingBySession} from "../controllers/paymentController.js";

const router = express.Router();

// POST /api/payment/checkout
router.post("/checkout", createCheckoutSession);
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);
router.get("/success/:sessionId", getBookingBySession);

export default router;
