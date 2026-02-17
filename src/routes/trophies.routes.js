const express = require("express");
const router = express.Router();

const trophiesController = require("../controllers/trophies.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");

const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return next();
  return authMiddleware(req, res, next);
};

router.post( "/", authMiddleware, requireRole(["admin"]), trophiesController.createTrophy );
router.get("/", optionalAuth, trophiesController.getAllTrophies);

router.post("/award", authMiddleware, requireRole(["admin"]), trophiesController.awardTrophy);

router.get("/mine", authMiddleware, trophiesController.getMyTrophies);

router.get("/users/:id", authMiddleware, requireRole(["admin"]), trophiesController.getUserTrophiesByAdmin);
router.delete("/:id", authMiddleware, requireRole(["admin"]), trophiesController.deleteTrophy);

module.exports = router;
