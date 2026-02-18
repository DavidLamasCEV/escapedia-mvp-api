const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");

const { getOwners } = require("../controllers/users.controller");

router.get("/owners", authMiddleware, requireRole(["admin"]), getOwners);

module.exports = router;
