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

    const day = scheduledDate.getDay(); // 0=Domingo, 6=Sabado
    const isWeekend = day === 0 || day === 6;

    const allowedSlots = isWeekend ? room.weekendSlots : room.weekSlots;

    const hh = String(scheduledDate.getHours()).padStart(2, "0");
    const mm = String(scheduledDate.getMinutes()).padStart(2, "0");
    const timeHHmm = `${hh}:${mm}`;

    if (!Array.isArray(allowedSlots) || allowedSlots.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "Esta sala no tiene horarios configurados para ese día",
      });
    }

    if (!allowedSlots.includes(timeHHmm)) {
      return res.status(400).json({
        ok: false,
        message: "Ese horario no existe para esta sala en ese día",
        info: {
          dayType: isWeekend ? "weekend" : "week",
          allowedSlots,
        },
      });
    }


    if (playersNum < Number(room.playersMin) || playersNum > Number(room.playersMax)) {
      return res.status(400).json({
        ok: false,
        message: "Numero de jugadores fuera de rango para esta sala",
      });
    }

    // Regla: si faltan menos de 12h, hay que llamar (no se permite reservar online)
    const now = new Date();
    const diffMs = scheduledDate.getTime() - now.getTime();
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    const userRole = req.user.role;

    if (userRole === "user" && diffMs < twelveHoursMs) {
      return res.status(409).json({
        ok: false,
        code: "CALL_REQUIRED",
        message: "Faltan menos de 12 horas. Llama para confirmar disponibilidad.",
      });
    }


    await ensureNoOverlap(roomId, scheduledDate);

    let bookingUserId = req.user.id;

    if (userRole === "owner" || userRole === "admin") {
      if (userId) {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          return res.status(400).json({ ok: false, message: "userId invalido" });
        }

        const user = await User.findById(userId).select("_id role isDeleted");
        if (!user || user.isDeleted) {
          return res.status(404).json({ ok: false, message: "Usuario no encontrado" });
        }

        if (user.role !== "user") {
          return res.status(400).json({ ok: false, message: "Solo se puede asignar la reserva a un usuario con role 'user'" });
        }

        bookingUserId = user._id;
      } else {
        return res.status(400).json({
          ok: false,
          message: "Para reservas manuales (owner/admin) debes indicar userId del cliente",
        });
      }
    }

    const canWriteInternal = userRole === "owner" || userRole === "admin";

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
      .populate("roomId", "title city durationMin")
      .sort({ createdAt: -1 });

    return res.status(200).json({ ok: true, bookings });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Error obteniendo reservas" });
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

exports.updateBookingNotes = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { customerNote, internalNote } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ ok: false, message: "bookingId invalido" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking || booking.isDeleted) {
      return res.status(404).json({ ok: false, message: "Reserva no encontrada" });
    }

    let hasChanges = false;

    if (customerNote !== undefined) {
      if (String(booking.userId) !== String(userId) && userRole !== "admin") {
        return res.status(403).json({ ok: false, message: "No puedes modificar la nota del cliente" });
      }

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

