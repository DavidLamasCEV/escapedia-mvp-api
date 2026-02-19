const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middlewares/auth.middleware");

const {
  createBooking,
  getMyBookings,
  cancelMyBooking,
  updateBookingNotes,
  updateBookingStatus, 
} = require("../controllers/bookings.controller");

router.post("/", authMiddleware, createBooking);

router.get("/mine", authMiddleware, getMyBookings);

router.patch("/:id/status", authMiddleware, updateBookingStatus);

router.patch("/:id/cancel", authMiddleware, cancelMyBooking);
router.patch("/:id/notes", authMiddleware, updateBookingNotes);

module.exports = router;
