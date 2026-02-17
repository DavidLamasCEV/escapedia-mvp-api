const mongoose = require("mongoose");
const Review = require("../models/Review");
const Booking = require("../models/Booking");
const EscapeRoom = require("../models/EscapeRoom");

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function recalcRoomRating(roomId) {
  const stats = await Review.aggregate([
    { $match: { roomId: new mongoose.Types.ObjectId(roomId), isDeleted: false } },
    {
      $group: {
        _id: "$roomId",
        avg: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const avg = stats.length ? stats[0].avg : 0;
  const count = stats.length ? stats[0].count : 0;

  const avgRounded = Math.round(avg * 10) / 10;

  await EscapeRoom.findByIdAndUpdate(roomId, {
    ratingAvg: avgRounded,
    ratingCount: count,
  });
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

    // comment opcional
    let commentClean = "";
    if (comment !== undefined && comment !== null) {
      if (typeof comment !== "string") {
        return res.status(400).json({ ok: false, message: "comment debe ser texto" });
      }
      commentClean = comment.trim();
      if (commentClean.length > 1000) {
        return res.status(400).json({ ok: false, message: "comment demasiado largo (max 1000)" });
      }
    }

    const booking = await Booking.findById(bookingId);
    if (!booking || booking.isDeleted) {
      return res.status(404).json({ ok: false, message: "Booking no encontrada" });
    }

    if (String(booking.userId) !== String(userId)) {
      return res.status(403).json({ ok: false, message: "No puedes crear review para una booking que no es tuya" });
    }

    if (booking.status !== "completed") {
      return res.status(400).json({ ok: false, message: "Solo puedes crear review si la booking esta en completed" });
    }

    // si Review tiene soft delete, filtra aqui tambien
    const existing = await Review.findOne({ bookingId: booking._id, isDeleted: false });
    if (existing) {
      return res.status(409).json({ ok: false, message: "Ya existe una review para esta booking" });
    }

    const review = await Review.create({
      userId,
      roomId: booking.roomId,
      bookingId: booking._id,
      rating: ratingNum,
      comment: commentClean,
    });

    await recalcRoomRating(booking.roomId);

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

    const reviews = await Review.find({ userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .populate("roomId", "title city difficulty coverImageUrl ratingAvg ratingCount");

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

    const reviews = await Review.find({ roomId, isDeleted: false })
      .sort({ createdAt: -1 })
      .populate("userId", "name");

    return res.status(200).json({ ok: true, reviews });
  } catch (err) {
    return res.status(500).json({ ok: false, message: "Error obteniendo reviews de la sala" });
  }
}

async function updateReview(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const reviewId = req.params.id;
    const { rating, comment } = req.body;

    if (!reviewId || !isValidObjectId(reviewId)) {
      return res.status(400).json({ ok: false, message: "reviewId invalido" });
    }

    const review = await Review.findById(reviewId);
    if (!review || review.isDeleted) {
      return res.status(404).json({ ok: false, message: "Review no encontrada" });
    }

    const isOwnerOfReview = String(review.userId) === String(userId);
    const isAdmin = userRole === "admin";

    if (!isOwnerOfReview && !isAdmin) {
      return res.status(403).json({
        ok: false,
        message: "No tienes permisos para editar esta review",
      });
    }

    let hasChanges = false;

    if (rating !== undefined) {
      const ratingNum = Number(rating);
      if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({
          ok: false,
          message: "rating debe ser un entero entre 1 y 5",
        });
      }
      review.rating = ratingNum;
      hasChanges = true;
    }

    if (comment !== undefined) {
      if (comment === null) {
        review.comment = "";
        hasChanges = true;
      } else {
        if (typeof comment !== "string") {
          return res.status(400).json({
            ok: false,
            message: "comment debe ser texto",
          });
        }
        const commentClean = comment.trim();
        if (commentClean.length > 1000) {
          return res.status(400).json({
            ok: false,
            message: "comment demasiado largo (max 1000)",
          });
        }
        review.comment = commentClean;
        hasChanges = true;
      }
    }

    if (!hasChanges) {
      return res.status(400).json({
        ok: false,
        message: "No hay cambios que aplicar",
      });
    }

    await review.save();
    await recalcRoomRating(review.roomId);

    return res.status(200).json({ ok: true, review });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: "Error actualizando review",
    });
  }
}


async function deleteReview(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const reviewId = req.params.id;

    if (!reviewId || !isValidObjectId(reviewId)) {
      return res.status(400).json({ ok: false, message: "reviewId invalido" });
    }

    const review = await Review.findById(reviewId);
    if (!review || review.isDeleted) {
      return res.status(404).json({ ok: false, message: "Review no encontrada" });
    }

    const isOwnerOfReview = String(review.userId) === String(userId);
    const isAdmin = userRole === "admin";

    if (!isOwnerOfReview && !isAdmin) {
      return res.status(403).json({
        ok: false,
        message: "No tienes permisos para borrar esta review",
      });
    }

    review.isDeleted = true;
    review.deletedAt = new Date();
    await review.save();

    await recalcRoomRating(review.roomId);

    return res.status(200).json({
      ok: true,
      message: "Review borrada correctamente",
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: "Error borrando review",
    });
  }
}



module.exports = {
  createReview,
  getMyReviews,
  getReviewsByRoom,
  updateReview,
  deleteReview,
};
