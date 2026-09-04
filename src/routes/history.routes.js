// Importamos Express.
const express = require("express");

// Importamos controlador.
const { getGeneralHistory } = require("../controllers/history.controller");

// Importamos middleware de autenticación.
const { verifyFirebaseToken } = require("../middlewares/auth.middleware");

// Creamos router.
const router = express.Router();

/**
 * Obtener historial general.
 *
 * GET /api/history
 */
router.get("/", verifyFirebaseToken, getGeneralHistory);

module.exports = router;