const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");

const {
  listRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
} = require("../controllers/rooms.controller");

// Public
router.get("/", listRooms);
router.get("/:id", getRoomById);

// Owner/Admin
router.post("/", authMiddleware, requireRole(["owner", "admin"]), createRoom);
router.put("/:id", authMiddleware, requireRole(["owner", "admin"]), updateRoom);
router.delete("/:id", authMiddleware, requireRole(["owner", "admin"]), deleteRoom);

module.exports = router;
