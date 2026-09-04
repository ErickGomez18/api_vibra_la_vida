// Importamos Express.
const express = require("express");

// Importamos los controladores de usuario.
const {
  getMyProfile,
  updateMyProfile,
} = require("../controllers/user.controller");

// Importamos el middleware que verifica el token de Firebase.
const { verifyFirebaseToken } = require("../middlewares/auth.middleware");

// Creamos el router.
const router = express.Router();

/**
 * Obtener mi perfil.
 *
 * GET /api/users/me
 */
router.get("/me", verifyFirebaseToken, getMyProfile);

/**
 * Actualizar mi perfil.
 *
 * PUT /api/users/me
 */
router.put("/me", verifyFirebaseToken, updateMyProfile);

module.exports = router;