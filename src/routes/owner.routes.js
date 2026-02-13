const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");

const {
  getOwnerBookings,
  confirmBooking,
  completeBooking,
  cancelBookingAsOwner,
} = require("../controllers/bookings.controller");

router.get("/bookings", authMiddleware, requireRole(["owner", "admin"]), getOwnerBookings);
router.patch("/bookings/:id/confirm", authMiddleware, requireRole(["owner", "admin"]), confirmBooking);
router.patch("/bookings/:id/complete", authMiddleware, requireRole(["owner", "admin"]), completeBooking);
router.patch("/bookings/:id/cancel", authMiddleware, requireRole(["owner", "admin"]), cancelBookingAsOwner);

module.exports = router;
