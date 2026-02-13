const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./routes/auth.routes");
const roomRoutes = require("./routes/rooms.routes");
const localesRoutes = require("./routes/locales.routes");

const { authMiddleware } = require("./middlewares/auth.middleware");
const { requireRole } = require("./middlewares/role.middleware");

const bookingRoutes = require("./routes/booking.routes");
const ownerRoutes = require("./routes/owner.routes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

// Rutas
app.use("/auth", authRoutes);
app.use("/rooms", roomRoutes);
app.use("/locales", localesRoutes);
app.use("/bookings", bookingRoutes);
app.use("/owner", ownerRoutes);
console.log("[ROUTES] Auth routes mounted at /auth");

app.get("/admin-test", authMiddleware, requireRole(["admin"]), (req, res) => {
  return res.status(200).json({ ok: true, message: "Eres admin" });
});


// Healthcheck
app.get("/health", (req, res) => {
  return res.status(200).json({ ok: true, message: "API OK" });
});

// 404 siempre al final
app.use((req, res) => {
  return res.status(404).json({ ok: false, message: "Ruta no encontrada" });
});

module.exports = app;
