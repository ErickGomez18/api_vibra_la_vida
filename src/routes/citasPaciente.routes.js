// ============================================================================
// RESPUESTA DEL PACIENTE A CITAS - ROUTES
// ============================================================================

const express =
  require("express");


const {
  actualizarRespuestaPaciente,
} =
  require("../controllers/citasPaciente.controller");


const {
  verifyFirebaseToken,
} =
  require("../middlewares/auth.middleware");


const router =
  express.Router();


// ============================================================================
// TODAS LAS RUTAS REQUIEREN FIREBASE AUTH
// ============================================================================

router.use(
  verifyFirebaseToken
);


// PATCH /api/citas/:id/respuesta-paciente

router.patch(
  "/:id/respuesta-paciente",
  actualizarRespuestaPaciente
);


module.exports =
  router;
