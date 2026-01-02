import Booking from "../models/Booking.js";
import Doctor from "../models/Doctor.js"; // match your filename exactly


export const getDoctorBookings = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { from, to } = req.query;

    if (!doctorId) {
      return res.json({ success: false, message: "Doctor ID required" });
    }

    // Build finder object
    let filter = { doctorId };

    // DATE RANGE FILTER
    if (from && to) {
      filter.date = {
        $gte: from,
        $lte: to,
      };
    }

    const bookings = await Booking.find(filter).sort({ date: 1 });

    // Count stats
    const stats = {
      total: bookings.length,
      confirmed: bookings.filter(b => b.status === "Confirmed").length,
      cancelled: bookings.filter(b => b.status === "Cancelled").length,
      pending: bookings.filter(b => b.status === "Pending").length,
      today: bookings.filter(b => {
        return (
          new Date(b.date).toDateString() === new Date().toDateString()
        );
      }).length
    };

    // Add doctor name for frontend
    const doctor = await Doctor.findById(doctorId).select("name email");

    return res.json({
      success: true,
      doctor,
      bookings,
      stats,
    });

  } catch (err) {
    console.error("Error fetching doctor analytics:", err);
    return res.json({
      success: false,
      message: "Server error",
    });
  }
};
