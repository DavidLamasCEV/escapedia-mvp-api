// Punto de entrada del backend: carga .env, conecta DB y levanta el servidor.

require("dotenv").config();

const app = require("./app");
const { connectDB } = require("./config/db");

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

async function start() {
  try {
    await connectDB(MONGO_URI);

    app.listen(PORT, () => {
      console.log(`[SERVER] Escapedia API escuchando en puerto ${PORT}`);
    });
  } catch (error) {
    console.error("[SERVER] No se pudo arrancar el servidor:", error.message);
    process.exit(1);
  }
}

start();
