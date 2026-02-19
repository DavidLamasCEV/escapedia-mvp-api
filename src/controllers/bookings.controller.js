const Booking = require("../models/Booking");
const EscapeRoom = require("../models/EscapeRoom");
const Local = require("../models/Local");
const mongoose = require("mongoose");
const User = require("../models/user");

async function ensureNoOverlap(roomId, scheduledAt) {
  const existing = await Booking.findOne({
    roomId,
    scheduledAt: new Date(scheduledAt),
    status: { $in: ["pending", "confirmed"] },
  });

  if (existing) {
    const err = new Error("Ya existe una reserva para esa sala en ese horario");
    err.statusCode = 409;
    throw err;
  }
}

async function ensureOwnerOfRoom(reqUser, roomId) {
  const room = await EscapeRoom.findById(roomId);
  if (!room) {
    const err = new Error("Sala no encontrada");
    err.statusCode = 404;
    throw err;
  }

  const local = await Local.findById(room.localId);
  if (!local) {
    const err = new Error("Local no encontrado");
    err.statusCode = 404;
    throw err;
  }

  if (reqUser.role !== "admin" && String(local.ownerId) !== String(reqUser.id)) {
    const err = new Error("No tienes permisos sobre esta sala");
    err.statusCode = 403;
    throw err;
  }

  return { room, local };
}

const ALLOWED_STATUSES = ["pending", "confirmed", "cancelled", "completed"];

function assertValidNextStatus(currentStatus, nextStatus) {
  if (!ALLOWED_STATUSES.includes(nextStatus)) {
    const err = new Error("status invalido");
    err.statusCode = 400;
    throw err;
  }
  
  const transitions = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["completed", "cancelled"],
    cancelled: [],
    completed: [],
  };

  const allowed = transitions[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    const err = new Error(`Transicion no permitida: ${currentStatus} -> ${nextStatus}`);
    err.statusCode = 400;
    throw err;
  }
}

function applyStatus(booking, nextStatus) {
  if (booking.status === nextStatus) return;

  assertValidNextStatus(booking.status, nextStatus);

  booking.status = nextStatus;

  if (nextStatus === "confirmed") booking.confirmedAt = new Date();
  if (nextStatus === "completed") booking.completedAt = new Date();
  if (nextStatus === "cancelled") booking.cancelledAt = new Date();
}

exports.createBooking = async (req, res) => {
  try {
    const { roomId, scheduledAt, players, userId, customerNote, internalNote } = req.body;

    if (!roomId || !scheduledAt || players === undefined || players === null) {
      return res.status(400).json({
        ok: false,
        message: "Faltan campos obligatorios (roomId, scheduledAt, players)",
      });
    }

    const playersNum = Number(players);
    if (!Number.isInteger(playersNum) || playersNum < 1) {
      return res.status(400).json({
        ok: false,
        message: "players debe ser un numero entero mayor o igual a 1",
      });
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({
        ok: false,
        message: "scheduledAt debe ser una fecha valida",
      });
    }

    let customerNoteClean = "";
    if (customerNote !== undefined && customerNote !== null) {
      if (typeof customerNote !== "string") {
        return res.status(400).json({ ok: false, message: "customerNote debe ser texto" });
      }
      customerNoteClean = customerNote.trim();
      if (customerNoteClean.length > 500) {
        return res.status(400).json({ ok: false, message: "customerNote demasiado largo (max 500)" });
      }
    }

    let internalNoteClean = "";
    if (internalNote !== undefined && internalNote !== null) {
      if (typeof internalNote !== "string") {
        return res.status(400).json({ ok: false, message: "internalNote debe ser texto" });
      }
      internalNoteClean = internalNote.trim();
      if (internalNoteClean.length > 1000) {
        return res.status(400).json({ ok: false, message: "internalNote demasiado largo (max 1000)" });
      }
    }

    const room = await EscapeRoom.findById(roomId);
    if (!room || room.isActive === false) {
      return res.status(404).json({
        ok: false,
        message: "Sala no encontrada o inactiva",
      });
    }

    const day = scheduledDate.getDay(); 
    const isWeekend = day === 0 || day === 6;

    const allowedSlots = isWeekend ? room.weekendSlots : room.weekSlots;

    const hh = String(scheduledDate.getHours()).padStart(2, "0");
    const mm = String(scheduledDate.getMinutes()).padStart(2, "0");
    const timeHHmm = `${hh}:${mm}`;

    if (!Array.isArray(allowedSlots) || allowedSlots.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "Esta sala no tiene horarios configurados para ese dia",
      });
    }

    if (!allowedSlots.includes(timeHHmm)) {
      return res.status(400).json({
        ok: false,
        message: "Hora no disponible. Debe coincidir con un slot configurado",
      });
    }

    await ensureNoOverlap(roomId, scheduledDate);

    let bookingUserId = req.user.id;

    if ((req.user.role === "owner" || req.user.role === "admin") && userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ ok: false, message: "userId invalido" });
      }

      const existsUser = await User.findById(userId);
      if (!existsUser) {
        return res.status(404).json({ ok: false, message: "Usuario no encontrado" });
      }

      bookingUserId = userId;
    }

    const canWriteInternal = req.user.role === "owner" || req.user.role === "admin";

    const booking = await Booking.create({
      userId: bookingUserId,
      roomId,
      scheduledAt: scheduledDate,
      players: playersNum,
      status: "pending",
      customerNote: customerNoteClean,
      internalNote: canWriteInternal ? internalNoteClean : "",
      createdByUserId: req.user.id,
      createdByRole: req.user.role,
    });

    return res.status(201).json({ ok: true, booking });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      ok: false,
      message: error.message || "Error creando reserva",
    });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      userId: req.user.id,
      isDeleted: { $ne: true },
    })
      .select("-internalNote")
      .populate("roomId", "title city priceFrom durationMin")
      .sort({ scheduledAt: -1 });

    return res.status(200).json({ ok: true, bookings });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Error obteniendo reservas" });
  }
};

exports.cancelMyBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking || booking.isDeleted === true) {
      return res.status(404).json({ ok: false, message: "Reserva no encontrada" });
    }

    if (String(booking.userId) !== String(req.user.id)) {
      return res.status(403).json({ ok: false, message: "No puedes cancelar reservas de otros usuarios" });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({ ok: false, message: "Solo puedes cancelar reservas en estado pending" });
    }

    applyStatus(booking, "cancelled");
    await booking.save();

    return res.status(200).json({ ok: true, booking });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Error cancelando reserva" });
  }
};

exports.getOwnerBookings = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const locals = await Local.find({ ownerId: req.user.id }).select("_id");
    const localIds = locals.map((l) => l._id);

    const rooms = await EscapeRoom.find({ localId: { $in: localIds } }).select("_id");
    const roomIds = rooms.map((r) => r._id);

    const filters = {
      roomId: { $in: roomIds },
      isDeleted: { $ne: true },
    };

    const bookings = await Booking.find(filters)
      .populate("userId", "name email")
      .populate("roomId", "title city")
      .sort({ scheduledAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Booking.countDocuments(filters);

    return res.status(200).json({
      ok: true,
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
      bookings,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Error obteniendo reservas del owner" });
  }
};

exports.confirmBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking || booking.isDeleted === true) {
      return res.status(404).json({ ok: false, message: "Reserva no encontrada" });
    }

    await ensureOwnerOfRoom(req.user, booking.roomId);

    if (booking.status !== "pending") {
      return res.status(400).json({ ok: false, message: "Solo puedes confirmar reservas en estado pending" });
    }

    applyStatus(booking, "confirmed");
    await booking.save();

    return res.status(200).json({ ok: true, booking });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ ok: false, message: error.message || "Error confirmando reserva" });
  }
};

exports.completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking || booking.isDeleted === true) {
      return res.status(404).json({ ok: false, message: "Reserva no encontrada" });
    }

    await ensureOwnerOfRoom(req.user, booking.roomId);

    if (booking.status !== "confirmed") {
      return res.status(400).json({ ok: false, message: "Solo puedes completar reservas en estado confirmed" });
    }

    applyStatus(booking, "completed");
    await booking.save();

    return res.status(200).json({ ok: true, booking });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ ok: false, message: error.message || "Error completando reserva" });
  }
};

exports.cancelBookingAsOwner = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking || booking.isDeleted === true) {
      return res.status(404).json({ ok: false, message: "Reserva no encontrada" });
    }

    await ensureOwnerOfRoom(req.user, booking.roomId);

    if (booking.status === "completed") {
      return res.status(400).json({ ok: false, message: "No puedes cancelar una reserva ya completada" });
    }

    applyStatus(booking, "cancelled");
    await booking.save();

    return res.status(200).json({ ok: true, booking });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ ok: false, message: error.message || "Error cancelando reserva" });
  }
};

exports.updateBookingNotes = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking || booking.isDeleted === true) {
      return res.status(404).json({ ok: false, message: "Reserva no encontrada" });
    }

    const userRole = req.user.role;

    if (userRole !== "owner" && userRole !== "admin") {
      if (String(booking.userId) !== String(req.user.id)) {
        return res.status(403).json({ ok: false, message: "No puedes modificar notas de otras reservas" });
      }
    } else {
      await ensureOwnerOfRoom(req.user, booking.roomId);
    }

    const { customerNote, internalNote } = req.body;
    let hasChanges = false;

    if (customerNote !== undefined) {
      if (typeof customerNote !== "string") {
        return res.status(400).json({ ok: false, message: "customerNote debe ser texto" });
      }

      const clean = customerNote.trim();
      if (clean.length > 500) {
        return res.status(400).json({ ok: false, message: "customerNote demasiado largo (max 500)" });
      }

      booking.customerNote = clean;
      hasChanges = true;
    }

    if (internalNote !== undefined) {
      if (userRole !== "owner" && userRole !== "admin") {
        return res.status(403).json({ ok: false, message: "No puedes modificar la nota interna" });
      }

      if (typeof internalNote !== "string") {
        return res.status(400).json({ ok: false, message: "internalNote debe ser texto" });
      }

      const clean = internalNote.trim();
      if (clean.length > 1000) {
        return res.status(400).json({ ok: false, message: "internalNote demasiado largo (max 1000)" });
      }

      booking.internalNote = clean;
      hasChanges = true;
    }

    if (!hasChanges) {
      return res.status(400).json({ ok: false, message: "No hay cambios que aplicar" });
    }

    await booking.save();

    return res.status(200).json({ ok: true, booking });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Error actualizando notas" });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (typeof status !== "string") {
      return res.status(400).json({ ok: false, message: "status es obligatorio" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking || booking.isDeleted === true) {
      return res.status(404).json({ ok: false, message: "Reserva no encontrada" });
    }

    if (req.user.role === "user") {
      if (String(booking.userId) !== String(req.user.id)) {
        return res.status(403).json({ ok: false, message: "No puedes modificar reservas de otros usuarios" });
      }
      if (status !== "cancelled") {
        return res.status(403).json({ ok: false, message: "Solo puedes cancelar tu reserva" });
      }
      if (booking.status !== "pending") {
        return res.status(400).json({ ok: false, message: "Solo puedes cancelar reservas en estado pending" });
      }
    } else {
      await ensureOwnerOfRoom(req.user, booking.roomId);
    }

    applyStatus(booking, status);
    await booking.save();

    return res.status(200).json({ ok: true, booking });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ ok: false, message: error.message || "Error actualizando estado" });
  }
};
