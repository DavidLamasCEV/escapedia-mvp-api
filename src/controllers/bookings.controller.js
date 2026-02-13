const Booking = require("../models/Booking");
const EscapeRoom = require("../models/EscapeRoom");
const Local = require("../models/Local");

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

exports.createBooking = async (req, res) => {
  try {
    const { roomId, scheduledAt, players } = req.body;

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

    const room = await EscapeRoom.findById(roomId);
    if (!room || room.isActive === false) {
      return res.status(404).json({
        ok: false,
        message: "Sala no encontrada o inactiva",
      });
    }

    if (playersNum < Number(room.playersMin) || playersNum > Number(room.playersMax)) {
      return res.status(400).json({
        ok: false,
        message: "Numero de jugadores fuera de rango para esta sala",
      });
    }

    await ensureNoOverlap(roomId, scheduledDate);

    const booking = await Booking.create({
      userId: req.user.id,
      roomId,
      scheduledAt: scheduledDate,
      players: playersNum,
      status: "pending",
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
    const bookings = await Booking.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate("roomId", "title city difficulty durationMin localId");

    return res.status(200).json({ ok: true, bookings });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Error obteniendo mis reservas" });
  }
};

exports.cancelMyBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ ok: false, message: "Reserva no encontrada" });
    }

    if (String(booking.userId) !== String(req.user.id)) {
      return res.status(403).json({ ok: false, message: "No puedes cancelar reservas de otros usuarios" });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({ ok: false, message: "Solo puedes cancelar reservas en estado pending" });
    }

    booking.status = "cancelled";
    await booking.save();

    return res.status(200).json({ ok: true, booking });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Error cancelando reserva" });
  }
};

exports.getOwnerBookings = async (req, res) => {
  try {
    const { status } = req.query; // opcional filtrar por status

    const filter = {};
    if (status) filter.status = status;

    const myLocals = await Local.find({ ownerId: req.user.id }).select("_id");
    const localIds = myLocals.map((l) => l._id);

    const myRooms = await EscapeRoom.find({ localId: { $in: localIds } }).select("_id localId title");
    const roomIds = myRooms.map((r) => r._id);

    const bookings = await Booking.find({ roomId: { $in: roomIds }, ...filter })
      .sort({ createdAt: -1 })
      .populate("userId", "name email role")
      .populate("roomId", "title city localId");

    return res.status(200).json({ ok: true, bookings });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Error obteniendo reservas del owner" });
  }
};

exports.confirmBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ ok: false, message: "Reserva no encontrada" });
    }

    await ensureOwnerOfRoom(req.user, booking.roomId);

    if (booking.status !== "pending") {
      return res.status(400).json({ ok: false, message: "Solo puedes confirmar reservas en estado pending" });
    }

    booking.status = "confirmed";
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
    if (!booking) {
      return res.status(404).json({ ok: false, message: "Reserva no encontrada" });
    }

    await ensureOwnerOfRoom(req.user, booking.roomId);

    // Transicion valida: confirmed -> completed
    if (booking.status !== "confirmed") {
      return res.status(400).json({ ok: false, message: "Solo puedes completar reservas en estado confirmed" });
    }

    booking.status = "completed";
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
    if (!booking) {
      return res.status(404).json({ ok: false, message: "Reserva no encontrada" });
    }

    await ensureOwnerOfRoom(req.user, booking.roomId);

    if (booking.status === "completed") {
      return res.status(400).json({ ok: false, message: "No puedes cancelar una reserva ya completada" });
    }

    booking.status = "cancelled";
    await booking.save();

    return res.status(200).json({ ok: true, booking });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ ok: false, message: error.message || "Error cancelando reserva" });
  }
};
