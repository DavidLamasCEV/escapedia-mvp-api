const Local = require("../models/Local");
const EscapeRoom = require("../models/EscapeRoom");
const { uploadBase64Image, deleteByPublicId } = require("../services/cloudinary.service");


function withCover(localDoc) {
  const obj = localDoc.toObject ? localDoc.toObject() : localDoc;

  const cover =
    (obj.coverImageUrl && String(obj.coverImageUrl).trim() !== "")
      ? obj.coverImageUrl
      : `https://picsum.photos/seed/local-${obj._id}/800/450`;

  return { ...obj, coverImageUrl: cover };
}


exports.createLocal = async (req, res) => {
  try {
    const { name, city, address, phone, email, ownerId, coverImageUrl } = req.body;

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
      coverImageUrl: coverImageUrl || "",
      ownerId: finalOwnerId,
    });

    return res.status(201).json({ ok: true, local: withCover(local) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error creando local" });
  }
};

exports.getMyLocales = async (req, res) => {
  try {
    const localesRaw = await Local.find({
      ownerId: req.user.id,
      isDeleted: { $ne: true },
    }).sort({ createdAt: -1 });

    const locales = localesRaw.map(withCover);
    return res.status(200).json({ ok: true, locales });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error obteniendo locales" });
  }
};

exports.getAllLocales = async (req, res) => {
  try {
    const localesRaw = await Local.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    const locales = localesRaw.map(withCover);
    return res.status(200).json({ ok: true, locales });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error obteniendo locales" });
  }
};

exports.getLocalById = async (req, res) => {
  try {
    const { id } = req.params;

    const local = await Local.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate("ownerId", "name email role");

    if (!local) {
      return res.status(404).json({ ok: false, message: "Local no encontrado" });
    }

    if (req.user.role !== "admin") {
      const ownerId = local.ownerId?._id ? String(local.ownerId._id) : String(local.ownerId);
      if (ownerId !== String(req.user.id)) {
        return res.status(403).json({ ok: false, message: "No autorizado para ver este local" });
      }
    }

    return res.status(200).json({ ok: true, local: withCover(local) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error obteniendo el local" });
  }
};

exports.updateLocal = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, city, address, phone, email, ownerId, coverImageUrl } = req.body;

    const local = await Local.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!local) {
      return res.status(404).json({ ok: false, message: "Local no encontrado" });
    }

    if (name !== undefined) local.name = name;
    if (city !== undefined) local.city = city;
    if (address !== undefined) local.address = address;
    if (phone !== undefined) local.phone = phone;
    if (email !== undefined) local.email = email;
    if (coverImageUrl !== undefined) local.coverImageUrl = coverImageUrl;

    if (ownerId !== undefined) local.ownerId = ownerId;

    await local.save();

    const updated = await Local.findById(id).populate("ownerId", "name email role");
    return res.status(200).json({ ok: true, local: withCover(updated) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error actualizando local" });
  }
};

exports.deleteLocal = async (req, res) => {
  try {
    const { id } = req.params;

    const local = await Local.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!local) {
      return res.status(404).json({ ok: false, message: "Local no encontrado" });
    }

    local.isDeleted = true;
    local.deletedAt = new Date();
    await local.save();

    return res.status(200).json({ ok: true, message: "Local eliminado (soft delete)" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error eliminando local" });
  }
};

exports.getPublicLocales = async (req, res) => {
  try {
    const localesRaw = await Local.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    const locales = localesRaw.map(withCover);
    return res.status(200).json({ ok: true, locales });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error listando locales" });
  }
};

exports.getPublicLocalById = async (req, res) => {
  try {
    const { id } = req.params;

    const local = await Local.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!local) {
      return res.status(404).json({ ok: false, message: "Local no encontrado" });
    }

    return res.status(200).json({ ok: true, local: withCover(local) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error obteniendo local" });
  }
};

exports.getPublicRoomsByLocal = async (req, res) => {
  try {
    const { id } = req.params;

    const local = await Local.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!local) {
      return res.status(404).json({ ok: false, message: "Local no encontrado" });
    }

    const rooms = await EscapeRoom.find({
      localId: id,
      isActive: true,
      isDeleted: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .select("title city durationMin playersMin playersMax priceFrom ratingAvg ratingCount themes coverImageUrl galleryImageUrls");

    return res.status(200).json({ ok: true, rooms });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error listando salas del local" });
  }
};

exports.uploadLocalCover = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ ok: false, message: "Falta archivo (campo image)" });
    }

    const local = await Local.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!local) {
      return res.status(404).json({ ok: false, message: "Local no encontrado" });
    }

    if (req.user.role !== "admin") {
      if (String(local.ownerId) !== String(req.user.id)) {
        return res.status(403).json({ ok: false, message: "No autorizado para editar este local" });
      }
    }

    if (local.coverImagePublicId) {
      try {
        await deleteByPublicId(local.coverImagePublicId);
      } catch (err) {
        console.error("Error borrando imagen anterior en Cloudinary:", err);
      }
    }

    const base64 = req.file.buffer.toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${base64}`;

    const uploaded = await uploadBase64Image(dataUri, "escapedia/locales");

    local.coverImageUrl = uploaded.url || "";
    local.coverImagePublicId = uploaded.publicId || "";
    await local.save();

    const updated = await Local.findById(id).populate("ownerId", "name email role");
    return res.status(200).json({ ok: true, local: withCover(updated) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error subiendo portada del local" });
  }
};

exports.deleteLocalCover = async (req, res) => {
  try {
    const { id } = req.params;

    const local = await Local.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!local) {
      return res.status(404).json({ ok: false, message: "Local no encontrado" });
    }

    if (req.user.role !== "admin") {
      if (String(local.ownerId) !== String(req.user.id)) {
        return res.status(403).json({ ok: false, message: "No autorizado para editar este local" });
      }
    }

    if (local.coverImagePublicId) {
      try {
        await deleteByPublicId(local.coverImagePublicId);
      } catch (err) {
        console.error("Error borrando imagen en Cloudinary:", err);
      }
    }

    local.coverImageUrl = "";
    local.coverImagePublicId = "";
    await local.save();

    const updated = await Local.findById(id).populate("ownerId", "name email role");
    return res.status(200).json({ ok: true, local: withCover(updated) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error eliminando portada del local" });
  }
};


