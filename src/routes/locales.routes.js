const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");

const {
  createLocal,
  getMyLocales,
  getAllLocales,
  getLocalById,
  updateLocal,
  deleteLocal
} = require("../controllers/locales.controller");

router.post("/", authMiddleware, requireRole(["owner", "admin"]), createLocal);

// Importante: rutas fijas antes que /:id
router.get("/mine", authMiddleware, requireRole(["owner", "admin"]), getMyLocales);

// Admin: todos
router.get("/", authMiddleware, requireRole(["admin"]), getAllLocales);

// Detalle (owner/admin, el controller valida)
router.get("/:id", authMiddleware, requireRole(["owner", "admin"]), getLocalById);

// Admin: editar/borrar
router.put("/:id", authMiddleware, requireRole(["admin"]), updateLocal);
router.delete("/:id", authMiddleware, requireRole(["admin"]), deleteLocal);

module.exports = router;
