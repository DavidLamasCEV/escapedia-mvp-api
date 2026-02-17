const express = require("express");
const router = express.Router();

const { body, query } = require("express-validator");
const { validate } = require("../middlewares/validate.middleware");


const { authMiddleware } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");
const roomsController = require("../controllers/rooms.controller");

const { listRooms, getRoomById, createRoom, updateRoom, deleteRoom, } = require("../controllers/rooms.controller");

const reviewsController = require("../controllers/reviews.controller");

// Public
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).withMessage("page debe ser entero >= 1"),
    query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("limit debe ser entero entre 1 y 50"),

    query("city").optional().isString().trim(),
    query("difficulty").optional().isString().trim(),
    query("theme").optional().isString().trim(),

    query("minPrice").optional().isFloat({ min: 0 }).withMessage("minPrice debe ser numero >= 0"),
    query("maxPrice").optional().isFloat({ min: 0 }).withMessage("maxPrice debe ser numero >= 0"),

    query("sort")
      .optional()
      .isIn(["new", "old", "priceAsc", "priceDesc", "priceFrom", "popular"])
      .withMessage("sort invalido"),

    validate,
  ],
  listRooms
);

router.get("/:id", getRoomById);
router.get("/:id/reviews", reviewsController.getReviewsByRoom);


// Owner/Admin
router.post("/", authMiddleware, requireRole(["owner", "admin"]), createRoom);
router.put("/:id", authMiddleware, requireRole(["owner", "admin"]), updateRoom);
router.delete("/:id", authMiddleware, requireRole(["owner", "admin"]), deleteRoom);
router.post("/:id/images", authMiddleware, requireRole(["owner", "admin"]), roomsController.addRoomImage);
router.delete("/:id/images", authMiddleware, requireRole(["owner", "admin"]), roomsController.deleteRoomImage);

module.exports = router;
