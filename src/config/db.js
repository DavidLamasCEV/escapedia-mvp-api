// Conexion a MongoDB usando Mongoose.

const mongoose = require("mongoose");

async function connectDB(mongoUri) {
  try {
    if (!mongoUri) {
      throw new Error("MONGO_URI no definida en el .env");
    }

    await mongoose.connect(mongoUri);

    console.log("[DB] MongoDB conectado");
  } catch (error) {
    console.error("[DB] Error conectando a MongoDB:", error.message);
    throw error;
  }
}

module.exports = { connectDB };
