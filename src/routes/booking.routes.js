const express = require("express");
const router = express.Router();

const { body } = require("express-validator");
const { validate } = require("../middlewares/validate.middleware");
const { authMiddleware } = require("../middlewares/auth.middleware");

const {
  createBooking,
  getMyBookings,
  cancelMyBooking,
} = require("../controllers/bookings.controller");

router.post( "/", authMiddleware, createBooking );

router.get("/mine", authMiddleware, getMyBookings);
router.patch("/:id/cancel", authMiddleware, cancelMyBooking);

module.exports = router;
