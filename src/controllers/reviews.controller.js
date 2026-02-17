const Review = require("../models/Review");
const Booking = require("../models/Booking");

function isValidObjectId(id) {
  return typeof id === "string" && id.match(/^[0-9a-fA-F]{24}$/);
}


async function createReview(req, res) {
  try {
    const userId = req.user.id;
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !isValidObjectId(bookingId)) {
      return res.status(400).json({ ok: false, message: "bookingId invalido" });
    }

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ ok: false, message: "rating debe ser un entero entre 1 y 5" });
    }

    if (typeof comment !== "string" || comment.trim().length < 3) {
      return res.status(400).json({ ok: false, message: "comment es obligatorio (min 3 caracteres)" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ ok: false, message: "Booking no encontrada" });
    }

    if (String(booking.userId) !== String(userId)) {
      return res.status(403).json({ ok: false, message: "No puedes crear review para una booking que no es tuya" });
    }

    if (booking.status !== "completed") {
      return res.status(400).json({ ok: false, message: "Solo puedes crear review si la booking esta en completed" });
    }

    const existing = await Review.findOne({ bookingId: booking._id });
    if (existing) {
      return res.status(409).json({ ok: false, message: "Ya existe una review para esta booking" });
    }

    const review = await Review.create({
      userId,
      roomId: booking.roomId,
      bookingId: booking._id,
      rating: ratingNum,
      comment: comment.trim(),
    });

    return res.status(201).json({ ok: true, review });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ ok: false, message: "Ya existe una review para esta booking" });
    }
    return res.status(500).json({ ok: false, message: "Error creando review" });
  }
}

async function getMyReviews(req, res) {
  try {
    const userId = req.user.id;

    const reviews = await Review.find({ userId })
      .sort({ createdAt: -1 })
      .populate("roomId", "title city difficulty coverImageUrl");

    return res.status(200).json({ ok: true, reviews });
  } catch (err) {
    return res.status(500).json({ ok: false, message: "Error obteniendo tus reviews" });
  }
}

async function getReviewsByRoom(req, res) {
  try {
    const roomId = req.params.id;

    if (!isValidObjectId(roomId)) {
      return res.status(400).json({ ok: false, message: "roomId invalido" });
    }

    const reviews = await Review.find({ roomId })
      .sort({ createdAt: -1 })
      .populate("userId", "name");

    return res.status(200).json({ ok: true, reviews });
  } catch (err) {
    return res.status(500).json({ ok: false, message: "Error obteniendo reviews de la sala" });
  }
}

module.exports = {
  createReview,
  getMyReviews,
  getReviewsByRoom,
};
