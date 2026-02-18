const EscapeRoom = require("../models/EscapeRoom");
const Local = require("../models/Local");
const Booking = require("../models/Booking");
const { uploadBase64Image } = require("../services/cloudinary.service");
const { deleteByPublicId } = require("../services/cloudinary.service");

// GET /rooms (public)
exports.listRooms = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      city,
      difficulty,
      theme,
      minPrice,
      maxPrice,
      sort = "new",
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (!Number.isInteger(pageNum) || pageNum < 1) {
      return res.status(400).json({ ok: false, message: "page debe ser un entero >= 1" });
    }

    if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({ ok: false, message: "limit debe ser un entero entre 1 y 50" });
    }

    let minPriceNum = null;
    let maxPriceNum = null;

    if (minPrice !== undefined) {
      minPriceNum = Number(minPrice);
      if (Number.isNaN(minPriceNum) || minPriceNum < 0) {
        return res.status(400).json({ ok: false, message: "minPrice debe ser un numero >= 0" });
      }
    }

    if (maxPrice !== undefined) {
      maxPriceNum = Number(maxPrice);
      if (Number.isNaN(maxPriceNum) || maxPriceNum < 0) {
        return res.status(400).json({ ok: false, message: "maxPrice debe ser un numero >= 0" });
      }
    }

    if (minPriceNum !== null && maxPriceNum !== null && minPriceNum > maxPriceNum) {
      return res.status(400).json({ ok: false, message: "minPrice no puede ser mayor que maxPrice" });
    }

    const filters = { isActive: true };

    if (city) filters.city = city;
    if (difficulty) filters.difficulty = difficulty;
    if (theme) filters.themes = theme;

    if (minPriceNum !== null || maxPriceNum !== null) {
      filters.priceFrom = {};
      if (minPriceNum !== null) filters.priceFrom.$gte = minPriceNum;
      if (maxPriceNum !== null) filters.priceFrom.$lte = maxPriceNum;
    }

    let sortObj = { createdAt: -1 }; // default = new

    if (sort === "old") sortObj = { createdAt: 1 };
    if (sort === "priceAsc") sortObj = { priceFrom: 1 };
    if (sort === "priceDesc") sortObj = { priceFrom: -1 };
    if (sort === "priceFrom") sortObj = { priceFrom: 1 }; // alias
    if (sort === "popular") sortObj = { ratingCount: -1, ratingAvg: -1 };

    // 5) Query
    const roomsRaw = await EscapeRoom.find(filters)
      .sort(sortObj)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate("localId", "name city");

    const rooms = roomsRaw.map(r => {
      const obj = r.toObject({ virtuals: true });

      const cover =
        obj.coverImageUrl ||
        obj.coverImage ||
        obj.image ||
        obj.imageUrl ||
        obj.mainImageUrl ||
        (Array.isArray(obj.images) ? obj.images[0] : null) ||
        (Array.isArray(obj.gallery) ? obj.gallery[0] : null);

      return {
        ...obj,
        coverImageUrl: cover || null,
      };
    });

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
      weekSlots = [],
      weekendSlots = [],
      slotDurationMin,
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

    // owner solo puede crear rooms en sus venues (admin puede en cualquiera)
    if (req.user.role !== "admin" && String(local.ownerId) !== String(req.user.id)) {
        return res.status(403).json({ ok: false, message: "No puedes crear salas en locales que no son tuyos" });
    }

    if (!Array.isArray(weekSlots) || !Array.isArray(weekendSlots)) {
      return res.status(400).json({ ok: false, message: "weekSlots y weekendSlots deben ser arrays" });
    }

    if (weekSlots.length === 0 || weekendSlots.length === 0) {
      return res.status(400).json({ ok: false, message: "Debes configurar horarios de semana y fin de semana" });
    }


    const room = await EscapeRoom.create({
      localId,
      title,
      description,
      city,
      themes,
      difficulty,
      durationMin,
      weekSlots,
      weekendSlots,
      slotDurationMin,
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

    room.isActive = false;
    await room.save();

    return res.status(200).json({ ok: true, message: "Sala desactivada" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error desactivando sala" });
  }
};

exports.addRoomImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const roomId = req.params.id;

    const { imageBase64 } = req.body;

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res.status(400).json({
        ok: false,
        message: "imageBase64 es obligatorio",
      });
    }

    if (!imageBase64.startsWith("data:image/")) {
      return res.status(400).json({
        ok: false,
        message: "Formato invalido: debe ser data:image/...;base64,...",
      });
    }

    const room = await EscapeRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ ok: false, message: "Room no encontrada" });
    }

    const local = await Local.findById(room.localId);
    if (!local) {
      return res.status(404).json({ ok: false, message: "Local no encontrado" });
    }

    const isAdmin = req.user.role === "admin";

    if (!isAdmin && String(local.ownerId) !== String(userId)) {
      return res.status(403).json({
        ok: false,
        message: "No tienes permisos sobre este local"
      });
    }


    const upload = await uploadBase64Image(imageBase64, `escapedia/rooms/${roomId}`);

    room.galleryImageUrls = room.galleryImageUrls || [];
    room.galleryImageUrls.push(upload.url);

    await room.save();

    return res.status(200).json({
      ok: true,
      message: "Imagen subida correctamente",
      imageUrl: upload.url
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error subiendo imagen" });
  }
};

exports.deleteRoomImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const roomId = req.params.id;

    const { imageUrl } = req.body;

    if (!imageUrl || typeof imageUrl !== "string") {
      return res.status(400).json({
        ok: false,
        message: "imageUrl es obligatorio",
      });
    }

    const room = await EscapeRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ ok: false, message: "Room no encontrada" });
    }

    const local = await Local.findById(room.localId);
    if (!local) {
      return res.status(404).json({ ok: false, message: "Local no encontrado" });
    }

    const isAdmin = req.user.role === "admin";

    if (!isAdmin && String(local.ownerId) !== String(userId)) {
      return res.status(403).json({
        ok: false,
        message: "No tienes permisos sobre este local"
      });
    }


    const before = room.galleryImageUrls.length;
    room.galleryImageUrls = room.galleryImageUrls.filter((url) => url !== imageUrl);

    if (room.galleryImageUrls.length === before) {
      return res.status(404).json({
        ok: false,
        message: "Esa imagen no existe en la galeria de esta room",
      });
    }

    await room.save();

    try {
      const marker = "/upload/";
      const idx = imageUrl.indexOf(marker);

      if (idx !== -1) {
        const afterUpload = imageUrl.substring(idx + marker.length); // v123/escapedia/rooms/.../archivo.png
        const parts = afterUpload.split("/");

        // Quitamos la parte "v123..." si existe
        if (parts[0].startsWith("v")) {
          parts.shift();
        }

        const pathWithFile = parts.join("/"); // escapedia/rooms/.../archivo.png
        const noQuery = pathWithFile.split("?")[0];
        const noExt = noQuery.replace(/\.[^/.]+$/, ""); // quitamos extension

        await deleteByPublicId(noExt);
      }
    } catch (cloudErr) {
      console.error("[deleteRoomImage] Cloudinary delete error:", cloudErr && cloudErr.message ? cloudErr.message : cloudErr);
    }

    return res.status(200).json({
      ok: true,
      message: "Imagen eliminada correctamente",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error eliminando imagen" });
  }
};

exports.getRoomAvailability = async (req, res) => {
  try {
    const roomId = req.params.id;
    const { date } = req.query; // "YYYY-MM-DD"

    if (!date || typeof date !== "string") {
      return res.status(400).json({ ok: false, message: "date es obligatorio (YYYY-MM-DD)" });
    }

    const room = await EscapeRoom.findById(roomId);
    if (!room || room.isActive === false) {
      return res.status(404).json({ ok: false, message: "Sala no encontrada o inactiva" });
    }

    const parts = date.split("-");
    if (parts.length !== 3) {
      return res.status(400).json({ ok: false, message: "Formato de date invalido (YYYY-MM-DD)" });
    }

    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);

    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
      return res.status(400).json({ ok: false, message: "Formato de date invalido (YYYY-MM-DD)" });
    }

    const dayDate = new Date(y, m - 1, d);
    if (isNaN(dayDate.getTime())) {
      return res.status(400).json({ ok: false, message: "date no es una fecha valida" });
    }

    const day = dayDate.getDay();
    const isWeekend = day === 0 || day === 6;
    const slots = isWeekend ? room.weekendSlots : room.weekSlots;

    const now = new Date();
    const twelveHoursMs = 12 * 60 * 60 * 1000;

    const results = [];

    for (const slot of slots) {
      const [hhStr, mmStr] = slot.split(":");
      const hh = Number(hhStr);
      const mm = Number(mmStr);

      const slotDate = new Date(y, m - 1, d, hh, mm, 0, 0);

      // Existe booking en ese slot?
      const existing = await Booking.findOne({
        roomId,
        scheduledAt: slotDate,
        status: { $in: ["pending", "confirmed"] },
      });

      const diffMs = slotDate.getTime() - now.getTime();

      results.push({
        slot, // "HH:mm"
        scheduledAt: slotDate,
        available: !existing && diffMs > 0, 
        callRequired: diffMs > 0 && diffMs < twelveHoursMs,
      });
    }

    return res.status(200).json({
      ok: true,
      roomId,
      date,
      dayType: isWeekend ? "weekend" : "week",
      availability: results,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error obteniendo disponibilidad" });
  }
};

