// Importamos Express.
const express = require("express");

// Importamos controladores.
const {
  saveResult,
  getMyResults,
  getResultsByType,
  deleteResult,
} = require("../controllers/results.controller");

// Importamos middleware de autenticación.
const { verifyFirebaseToken } = require("../middlewares/auth.middleware");

// Creamos el router.
const router = express.Router();

/**
 * Guardar resultado.
 *
 * POST /api/results
 */
router.post("/", verifyFirebaseToken, saveResult);

/**
 * Obtener todos mis resultados.
 *
 * GET /api/results
 */
router.get("/", verifyFirebaseToken, getMyResults);

/**
 * Obtener resultados por tipo.
 *
 * GET /api/results/type/:tipo
 */
router.get("/type/:tipo", verifyFirebaseToken, getResultsByType);

/**
 * Eliminar resultado.
 *
 * DELETE /api/results/:id
 */
router.delete("/:id", verifyFirebaseToken, deleteResult);

module.exports = router;