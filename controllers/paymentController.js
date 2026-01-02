import Stripe from "stripe";
import Booking from "../models/Booking.js";
import Doctor from "../models/Doctor.js";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (req, res) => {
  try {
    const {
      formData,
      service,
      selectedDate,
      selectedTime,
      doctorId,
    } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: service },
            unit_amount: 5000, // €50
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment-cancel`,
      metadata: {
        service,
        selectedDate,
        selectedTime,
        doctorId: doctorId || "",
        formData: JSON.stringify(formData),
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe Error:", err);
    res.status(500).json({ message: "Stripe session failed" });
  }
};


export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("💡 Webhook received event:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log("💰 Session metadata:", session.metadata);

    try {
      // Safely parse metadata
      const {
        formData = "{}",
        service = "",
        selectedDate = "",
        selectedTime = "",
        doctorId = "",
      } = session.metadata;

      const parsedFormData = JSON.parse(formData);

      // Validate required fields
      if (!parsedFormData.name || !parsedFormData.email) {
        console.error("❌ Missing patient data in formData");
        return res.status(400).send("Missing patient data");
      }

      let assignedDoctorId = doctorId;

      // Auto-assign doctor if none
      if (!assignedDoctorId) {
        const availableDoctor = await Doctor.findOne({
          isActive: true,
          availableTimes: selectedTime,
        });

        if (!availableDoctor) {
          console.warn("⚠️ No doctor available at this time");
          // Still respond 200 to Stripe, do not fail
          return res.json({ received: true, warning: "No doctor available" });
        }

        assignedDoctorId = availableDoctor._id;
      }

      // Create booking AFTER payment
      const newBooking = await Booking.create({
        patientName: parsedFormData.name,
        patientEmail: parsedFormData.email,
        service,
        date: selectedDate,
        time: selectedTime,
        doctor: assignedDoctorId,
        paymentStatus: "paid",
        stripeSessionId: session.id,
      });

      console.log("✅ Booking created after payment:", newBooking._id);
    } catch (err) {
      console.error("❌ Booking creation failed:", err);
      return res.status(500).send("Booking creation failed");
    }
  }

  // Respond to Stripe
  res.json({ received: true });
};


export const getBookingBySession = async (req, res) => {
  const { sessionId } = req.params;
  try {
    const booking = await Booking.findOne({ stripeSessionId: sessionId }).populate("doctor", "name email");
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Format doctor name if populated
    const bookingData = {
      ...booking.toObject(),
      doctorName: booking.doctor?.name || null,
    };

    res.json({ booking: bookingData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};