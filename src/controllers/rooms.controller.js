const EscapeRoom = require("../models/EscapeRoom");
const Local = require("../models/Local");

// GET /rooms (public)
exports.listRooms = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      city,
      difficulty,
      theme,
      sort = "new", // new | old | priceAsc | priceDesc
    } = req.query;

    const filters = { isActive: true };

    if (city) filters.city = city;
    if (difficulty) filters.difficulty = difficulty;
    if (theme) filters.themes = theme;

    let sortObj = { createdAt: -1 };
    if (sort === "old") sortObj = { createdAt: 1 };
    if (sort === "priceAsc") sortObj = { priceFrom: 1 };
    if (sort === "priceDesc") sortObj = { priceFrom: -1 };

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const rooms = await EscapeRoom.find(filters)
      .sort(sortObj)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate("localId", "name city");

    const total = await EscapeRoom.countDocuments(filters);

    return res.status(200).json({
      ok: true,
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
      rooms,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error listando salas" });
  }
};

// GET /rooms/:id (public)
exports.getRoomById = async (req, res) => {
  try {
    const room = await EscapeRoom.findById(req.params.id).populate("localId", "name city address");
    if (!room) {
      return res.status(404).json({ ok: false, message: "Sala no encontrada" });
    }
    return res.status(200).json({ ok: true, room });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error obteniendo sala" });
  }
};

// POST /rooms (owner/admin)
exports.createRoom = async (req, res) => {
  try {
    const {
      localId,
      title,
      description,
      city,
      themes = [],
      difficulty,
      durationMin,
      playersMin,
      playersMax,
      priceFrom,
    } = req.body;

    if (
      !localId ||
      !title ||
      !description ||
      !city ||
      !difficulty ||
      durationMin == null ||
      playersMin == null ||
      playersMax == null ||
      priceFrom == null
    ) {
      return res.status(400).json({ ok: false, message: "Faltan campos obligatorios" });
    }

    const local = await Local.findById(localId);
    if (!local) {
      return res.status(404).json({ ok: false, message: "Local no encontrado" });
    }

    // Permisos: owner solo puede crear rooms en sus venues (admin puede en cualquiera)
    if (req.user.role !== "admin" && String(local.ownerId) !== String(req.user.id)) {
        return res.status(403).json({ ok: false, message: "No puedes crear salas en locales que no son tuyos" });
    }

    const room = await EscapeRoom.create({
      localId,
      title,
      description,
      city,
      themes,
      difficulty,
      durationMin,
      playersMin,
      playersMax,
      priceFrom,
    });

    return res.status(201).json({ ok: true, room });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error creando sala" });
  }
};

// PUT /rooms/:id (owner/admin)
exports.updateRoom = async (req, res) => {
  try {
    const room = await EscapeRoom.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ ok: false, message: "Sala no encontrada" });
    }

    const local = await Local.findById(room.localId);
    if (!local) {
      return res.status(404).json({ ok: false, message: "Local no encontrado" });
    }

    if (req.user.role !== "admin" && String(local.ownerId) !== String(req.user.id)) {
      return res.status(403).json({ ok: false, message: "No puedes editar salas que no son tuyas" });
    }

    const updated = await EscapeRoom.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.status(200).json({ ok: true, room: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error actualizando sala" });
  }
};

// DELETE /rooms/:id (owner/admin)
exports.deleteRoom = async (req, res) => {
  try {
    const room = await EscapeRoom.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ ok: false, message: "Sala no encontrada" });
    }

    const local = await Local.findById(room.localId);
    if (!local) {
      return res.status(404).json({ ok: false, message: "Local no encontrado" });
    }

    if (req.user.role !== "admin" && String(local.ownerId) !== String(req.user.id)) {
      return res.status(403).json({ ok: false, message: "No puedes borrar salas que no son tuyas" });
    }

    await EscapeRoom.findByIdAndDelete(req.params.id);
    return res.status(200).json({ ok: true, message: "Sala eliminada" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error borrando sala" });
  }
};
