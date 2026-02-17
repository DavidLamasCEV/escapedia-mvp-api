const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middlewares/auth.middleware");
const reviewsController = require("../controllers/reviews.controller");
const { requireRole } = require("../middlewares/role.middleware");


router.post("/", authMiddleware, reviewsController.createReview);

router.get("/mine", authMiddleware, reviewsController.getMyReviews);

router.put("/:id", authMiddleware, reviewsController.updateReview);
router.delete("/:id", authMiddleware, reviewsController.deleteReview);


module.exports = router;
