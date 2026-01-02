import Refund from "../models/refundModel.js";

// Add refund record
export const createRefund = async (req, res) => {
  try {
    const { name, email, paymentId, refundDate, reason } = req.body;

    const refund = await Refund.create({
      name,
      email,
      paymentId,
      refundDate,
      reason
    });

    res.status(201).json({
      success: true,
      refund
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRefunds = async (req, res) => {
  try {
    const { name, email, fromDate, toDate } = req.query;

    let filter = {};

    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    if (email) {
      filter.email = { $regex: email, $options: "i" };
    }

    if (fromDate && toDate) {
      filter.refundDate = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate)
      };
    }

    const refunds = await Refund.find(filter).sort({ refundDate: -1 });

    res.json({ success: true, refunds });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
