const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");
const { upload } = require("../middlewares/upload.middleware");

const {
  createLocal,
  getMyLocales,
  getAllLocales,
  getLocalById,
  updateLocal,
  deleteLocal,
  getPublicLocales,
  getPublicLocalById,
  getPublicRoomsByLocal,

  uploadLocalCover,
  deleteLocalCover,
} = require("../controllers/locales.controller");

router.get("/public", getPublicLocales);
router.get("/public/:id", getPublicLocalById);
router.get("/public/:id/rooms", getPublicRoomsByLocal);

router.post("/", authMiddleware, requireRole(["owner", "admin"]), createLocal);
router.get("/", authMiddleware, requireRole(["admin"]), getAllLocales);
router.get("/mine", authMiddleware, requireRole(["owner", "admin"]), getMyLocales);

router.get("/:id", authMiddleware, requireRole(["owner", "admin"]), getLocalById);
router.put("/:id", authMiddleware, requireRole(["admin"]), updateLocal);
router.delete("/:id", authMiddleware, requireRole(["admin"]), deleteLocal);

router.post(
  "/:id/cover",
  authMiddleware,
  requireRole(["owner", "admin"]),
  upload.single("image"),
  uploadLocalCover
);

router.delete(
  "/:id/cover",
  authMiddleware,
  requireRole(["owner", "admin"]),
  deleteLocalCover
);

module.exports = router;
