// Importamos Express.
const express = require("express");

// Importamos controladores.
const {
  syncHealthData,
  getLatestHealthData,
  getHealthHistory,
  deleteHealthRecord,
} = require("../controllers/health.controller");

// Importamos middleware de autenticación.
const { verifyFirebaseToken } = require("../middlewares/auth.middleware");

// Creamos el router.
const router = express.Router();

/**
 * Guardar datos de Health Connect.
 *
 * POST /api/health-connect/sync
 */
router.post("/sync", verifyFirebaseToken, syncHealthData);

/**
 * Obtener último registro.
 *
 * GET /api/health-connect/latest
 */
router.get("/latest", verifyFirebaseToken, getLatestHealthData);

/**
 * Obtener historial.
 *
 * GET /api/health-connect/history
 */
router.get("/history", verifyFirebaseToken, getHealthHistory);

/**
 * Eliminar registro.
 *
 * DELETE /api/health-connect/:id
 */
router.delete("/:id", verifyFirebaseToken, deleteHealthRecord);

module.exports = router;