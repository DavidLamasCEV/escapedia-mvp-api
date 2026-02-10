const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");

const { createLocal, getMyLocales } = require("../controllers/locales.controller");

router.post("/", authMiddleware, requireRole(["owner", "admin"]), createLocal);
router.get("/mine", authMiddleware, requireRole(["owner", "admin"]), getMyLocales);

module.exports = router;
