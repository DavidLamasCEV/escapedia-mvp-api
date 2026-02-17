const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middlewares/auth.middleware");
const reviewsController = require("../controllers/reviews.controller");

router.post("/", authMiddleware, reviewsController.createReview);

router.get("/mine", authMiddleware, reviewsController.getMyReviews);

module.exports = router;
