// ============================================================================
// ADHERENCIA DE MEDICAMENTOS - ROUTES
// ============================================================================

const express =
  require("express");


const {
  obtenerAdherencia,
  registrarAdherencia,
} =
  require("../controllers/adherenciaMedicamentos.controller");


const {
  verifyFirebaseToken,
} =
  require("../middlewares/auth.middleware");


const router =
  express.Router();


// ============================================================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================================================

router.use(
  verifyFirebaseToken
);


// GET /api/adherencia-medicamentos
router.get(
  "/",
  obtenerAdherencia
);


// POST /api/adherencia-medicamentos
router.post(
  "/",
  registrarAdherencia
);


module.exports =
  router;
