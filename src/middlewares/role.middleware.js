// Middleware para restringir rutas por rol

exports.requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        ok: false,
        message: "No tienes permisos para acceder a este recurso",
      });
    }

    next();
  };
};
