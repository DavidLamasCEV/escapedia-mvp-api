// Configura la app de Express: middlewares, rutas y manejo de errores.
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();

// Middlewares globales
app.use(cors()); // Permite llamadas desde el frontend (React) en otro puerto/dominio
app.use(express.json({ limit: "2mb" })); // Parseo de JSON en body
app.use(morgan("dev")); // Logs de peticiones en consola

// Ruta de prueba (healthcheck)
app.get("/health", (req, res) => {
  return res.status(200).json({
    ok: true,
    message: "API Escapedia MVP funcionando",
  });
});

// Middleware 404
app.use((req, res) => {
  return res.status(404).json({
    ok: false,
    message: "Ruta no encontrada",
  });
});

// Middleware de errores (placeholder)
app.use((err, req, res, next) => {
  console.error(err);
  return res.status(500).json({
    ok: false,
    message: "Error interno del servidor",
  });
});

module.exports = app;
