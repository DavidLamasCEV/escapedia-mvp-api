const nodemailer = require("nodemailer");

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || "true") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendResetPasswordEmail({ to, resetUrl }) {
  const transporter = getTransporter();

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to,
    subject: "Escapedia - Reset de password",
    text:
      "Has solicitado un reset de password.\n\n" +
      "Abre este enlace para cambiarla:\n" +
      resetUrl +
      "\n\n" +
      "Si no has sido tu, ignora este email.",
  });
}

module.exports = { sendResetPasswordEmail };
