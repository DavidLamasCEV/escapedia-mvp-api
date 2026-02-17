const Trophy = require("../models/Trophy");
const UserTrophy = require("../models/UserTrophy");
const User = require("../models/user");


exports.createTrophy = async (req, res) => {
  try {
    const { name, description, iconUrl, criteriaKey } = req.body;

    if (!name || !description || !criteriaKey) {
      return res.status(400).json({
        ok: false,
        message: "Faltan campos obligatorios",
      });
    }

    const existing = await Trophy.findOne({ criteriaKey: criteriaKey.toUpperCase() });
    if (existing) {
      return res.status(409).json({
        ok: false,
        message: "Ya existe un trofeo con ese criteriaKey",
      });
    }

    const trophy = await Trophy.create({
      name,
      description,
      iconUrl: iconUrl || null,
      criteriaKey: criteriaKey.toUpperCase(),
    });

    return res.status(201).json({
      ok: true,
      trophy,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: "Error creando trofeo",
    });
  }
};


exports.getAllTrophies = async (req, res) => {
  try {
    const trophies = await Trophy.find({ isActive: true });

    return res.status(200).json({
      ok: true,
      trophies,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error obteniendo trofeos",
    });
  }
};

exports.awardTrophy = async (req, res) => {
  try {
    const { userId, trophyId } = req.body;

    if (!userId || !trophyId) {
      return res.status(400).json({
        ok: false,
        message: "userId y trophyId requeridos",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        ok: false,
        message: "Usuario no encontrado",
      });
    }

    const trophy = await Trophy.findById(trophyId);
    if (!trophy) {
      return res.status(404).json({
        ok: false,
        message: "Trofeo no encontrado",
      });
    }

    const userTrophy = await UserTrophy.create({
      userId,
      trophyId,
    });

    return res.status(201).json({
      ok: true,
      userTrophy,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        ok: false,
        message: "El usuario ya tiene este trofeo",
      });
    }

    console.error(error);
    return res.status(500).json({
      ok: false,
      message: "Error otorgando trofeo",
    });
  }
};


exports.getMyTrophies = async (req, res) => {
  try {
    const userId = req.user.id;

    const userTrophies = await UserTrophy.find({ userId })
      .populate("trophyId");

    return res.status(200).json({
      ok: true,
      trophies: userTrophies,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error obteniendo trofeos del usuario",
    });
  }
};

exports.deleteTrophy = async (req, res) => {
  try {
    const trophyId = req.params.id;

    const trophy = await Trophy.findById(trophyId);
    if (!trophy) {
      return res.status(404).json({ ok: false, message: "Trofeo no encontrado" });
    }

    trophy.isActive = false;
    await trophy.save();

    return res.status(200).json({ ok: true, message: "Trofeo desactivado" });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Error desactivando trofeo" });
  }
};

exports.getUserTrophiesByAdmin = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).select("_id name email role");
    if (!user) {
      return res.status(404).json({ ok: false, message: "Usuario no encontrado" });
    }

    const trophies = await UserTrophy.find({ userId }).populate("trophyId");

    return res.status(200).json({
      ok: true,
      user,
      trophies,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Error obteniendo trofeos del usuario" });
  }
};

exports.getAllTrophies = async (req, res) => {
  try {
    const trophies = await Trophy.find({ isActive: true });

    if (!req.user || !req.user.id) {
      return res.status(200).json({ ok: true, trophies });
    }

    const userId = req.user.id;

    const earned = await UserTrophy.find({ userId }).select("trophyId");
    const earnedSet = new Set(earned.map((e) => String(e.trophyId)));

    const enriched = trophies.map((t) => ({
      _id: t._id,
      name: t.name,
      description: t.description,
      iconUrl: t.iconUrl,
      criteriaKey: t.criteriaKey,
      isActive: t.isActive,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      isEarned: earnedSet.has(String(t._id)),
    }));

    return res.status(200).json({ ok: true, trophies: enriched });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Error obteniendo trofeos" });
  }
};
