const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./routes/auth.routes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

// Rutas
app.use("/auth", authRoutes);
console.log("[ROUTES] Auth routes mounted at /auth");

// Healthcheck
app.get("/health", (req, res) => {
  return res.status(200).json({ ok: true, message: "API OK" });
});

// 404 siempre al final
app.use((req, res) => {
  return res.status(404).json({ ok: false, message: "Ruta no encontrada" });
});

module.exports = app;
