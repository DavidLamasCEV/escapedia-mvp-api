const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");

const { createLocal, getMyLocales, getAllLocales } = require("../controllers/locales.controller");

router.post("/", authMiddleware, requireRole(["owner", "admin"]), createLocal);
router.get("/", authMiddleware, requireRole(["admin"]), getAllLocales);
router.get("/mine", authMiddleware, requireRole(["owner", "admin"]), getMyLocales);

module.exports = router;
