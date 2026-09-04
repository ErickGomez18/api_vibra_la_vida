// Importamos Express.
const express = require("express");

// Importamos controladores.
const {
  register,
  login,
  verifySession,
} = require("../controllers/auth.controller");

// Importamos middleware de autenticación.
const { verifyFirebaseToken } = require("../middlewares/auth.middleware");

// Creamos el router.
const router = express.Router();

/**
 * Registrar usuario.
 *
 * POST /api/auth/register
 */
router.post("/register", register);

/**
 * Iniciar sesión.
 *
 * POST /api/auth/login
 */
router.post("/login", login);

/**
 * Verificar token de Firebase.
 *
 * GET /api/auth/verify
 */
router.get("/verify", verifyFirebaseToken, verifySession);

module.exports = router;