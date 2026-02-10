const Local = require("../models/Local");

exports.createLocal = async (req, res) => {
  try {
    const { name, city, address } = req.body;

    if (!name || !city || !address) {
      return res.status(400).json({ ok: false, message: "Faltan campos obligatorios" });
    }

    const local = await Local.create({
      name,
      city,
      address,
      ownerId: req.user.id,
    });

    return res.status(201).json({ ok: true, local });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error creando local" });
  }
};

exports.getMyLocales = async (req, res) => {
  try {
    const locales = await Local.find({ ownerId: req.user.id }).sort({ createdAt: -1 });
    return res.status(200).json({ ok: true, locales });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error obteniendo locales" });
  }
};
