import express from "express";
import { createRefund, getRefunds } from "../controllers/refundController.js";
import { verifyAdmin } from "../middleware/authadminMiddleware.js";

const router = express.Router();

router.post("/", verifyAdmin, createRefund);
router.get("/", verifyAdmin, getRefunds);

export default router;
