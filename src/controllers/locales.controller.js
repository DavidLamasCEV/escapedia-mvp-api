const Local = require("../models/Local");

exports.createLocal = async (req, res) => {
  try {
    const { name, city, address, phone, email, ownerId } = req.body;

    if (!name || !city || !address) {
      return res.status(400).json({ ok: false, message: "Faltan campos obligatorios" });
    }

    let finalOwnerId = req.user.id;

    if (req.user.role === "admin" && ownerId) {
      finalOwnerId = ownerId;
    }

    const local = await Local.create({
      name,
      city,
      address,
      phone,
      email,
      ownerId: finalOwnerId,
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

exports.getAllLocales = async (req, res) => {
  try {
    const locales = await Local.find().sort({ createdAt: -1 });
    return res.status(200).json({ ok: true, locales });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error obteniendo locales" });
  }
};

exports.getLocalById = async (req, res) => {
  try {
    const { id } = req.params;

    const local = await Local.findById(id).populate("ownerId", "name email role");

    if (!local) {
      return res.status(404).json({ ok: false, message: "Local no encontrado" });
    }

    if (req.user.role !== "admin") {
      const ownerId = local.ownerId?._id ? String(local.ownerId._id) : String(local.ownerId);
      if (ownerId !== String(req.user.id)) {
        return res.status(403).json({ ok: false, message: "No autorizado para ver este local" });
      }
    }

    return res.status(200).json({ ok: true, local });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error obteniendo el local" });
  }
};

exports.updateLocal = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, city, address, phone, email, ownerId } = req.body;

    const local = await Local.findById(id);
    if (!local) {
      return res.status(404).json({ ok: false, message: "Local no encontrado" });
    }

    // Campos editables
    if (name !== undefined) local.name = name;
    if (city !== undefined) local.city = city;
    if (address !== undefined) local.address = address;
    if (phone !== undefined) local.phone = phone;
    if (email !== undefined) local.email = email;

    // Reasignar owner (admin)
    if (ownerId !== undefined) local.ownerId = ownerId;

    await local.save();

    const updated = await Local.findById(id).populate("ownerId", "name email role");
    return res.status(200).json({ ok: true, local: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error actualizando local" });
  }
};

exports.deleteLocal = async (req, res) => {
  try {
    const { id } = req.params;

    const local = await Local.findById(id);
    if (!local) {
      return res.status(404).json({ ok: false, message: "Local no encontrado" });
    }

    await Local.findByIdAndDelete(id);
    return res.status(200).json({ ok: true, message: "Local eliminado" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error eliminando local" });
  }
};
