const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const crypto = require("crypto");
const PasswordResetToken = require("../models/PasswordResetToken.js");
const { sendResetPasswordEmail } = require("../services/mail.service");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validaciones básicas
    if (!name || !email || !password) {
      return res.status(400).json({
        ok: false,
        message: "Faltan campos obligatorios",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        ok: false,
        message: "El email ya está registrado",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      passwordHash,
    });

    return res.status(201).json({
      ok: true,
      message: "Usuario registrado correctamente",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: "Error en registro",
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        message: "Email y password requeridos",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Credenciales inválidas",
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        ok: false,
        message: "Credenciales inválidas",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      ok: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: "Error en login",
    });
  }
};

exports.me = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select("-passwordHash");
    if (!user) {
      return res.status(404).json({
        ok: false,
        message: "Usuario no encontrado",
      });
    }

    return res.status(200).json({
      ok: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error obteniendo usuario",
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        ok: false,
        message: "Email requerido",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(200).json({
        ok: true,
        message: "Si el email existe, se enviará un enlace de recuperación",
      });
    }

    await PasswordResetToken.updateMany(
      { userId: user._id, usedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { usedAt: new Date() } }
    );

    const token = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const ttlMin = Number(process.env.RESET_TOKEN_TTL_MIN || 30);
    const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000);

    await PasswordResetToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    const appUrl = process.env.APP_URL || "http://localhost:5173";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    try {
      await sendResetPasswordEmail({
        to: user.email,
        resetUrl,
      });
    } catch (mailErr) {
      console.error("[forgot-password] Mail error:", mailErr && mailErr.message ? mailErr.message : mailErr);
      // No devolvemos 500: el token ya está creado, el flujo sigue siendo válido para testeo
    }

    return res.status(200).json({
      ok: true,
      message: "Si el email existe, se enviará un enlace de recuperación",
    });
  } catch (error) {
    console.error("[forgot-password] ERROR:", error && error.message ? error.message : error);
    return res.status(500).json({
      ok: false,
      message: "Error en forgot-password",
    });
  }
};


exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        ok: false,
        message: "Token requerido",
      });
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({
        ok: false,
        message: "newPassword requerido (min 6 caracteres)",
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const record = await PasswordResetToken.findOne({
      tokenHash,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return res.status(400).json({
        ok: false,
        message: "Token inválido o expirado",
      });
    }

    const user = await User.findById(record.userId);
    if (!user) {
      return res.status(404).json({
        ok: false,
        message: "Usuario no encontrado",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    user.passwordHash = passwordHash;
    await user.save();

    record.usedAt = new Date();
    await record.save();

    return res.status(200).json({
      ok: true,
      message: "Contraseña actualizada correctamente",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: "Error en reset-password",
    });
  }
};
