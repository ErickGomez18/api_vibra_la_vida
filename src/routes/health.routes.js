// ============================================================================
// HEALTH ROUTES - VIBRA LA VIDA
// ============================================================================

const express =
  require("express");


const {

  syncHealthData,

  getLatestHealthData,

  getHealthHistory,

  deleteHealthRecord,

  getLatestPatientHealthData,

  getPatientHealthHistory,

} =
  require(
    "../controllers/health.controller"
  );


const {
  verifyFirebaseToken,
} =
  require(
    "../middlewares/auth.middleware"
  );


const router =
  express.Router();


// ============================================================================
// USUARIO: SINCRONIZAR SUS PROPIOS DATOS
// ============================================================================

router.post(

  "/sync",

  verifyFirebaseToken,

  syncHealthData
);


// ============================================================================
// USUARIO: OBTENER SU ÚLTIMO REGISTRO
// ============================================================================

router.get(

  "/latest",

  verifyFirebaseToken,

  getLatestHealthData
);


// ============================================================================
// USUARIO: OBTENER SU HISTORIAL
// ============================================================================

router.get(

  "/history",

  verifyFirebaseToken,

  getHealthHistory
);


// ============================================================================
// PROFESIONAL: ÚLTIMO REGISTRO DEL PACIENTE VINCULADO
// ============================================================================
//
// GET /api/health-connect/paciente/:pacienteUid/latest
//
// ============================================================================

router.get(

  "/paciente/:pacienteUid/latest",

  verifyFirebaseToken,

  getLatestPatientHealthData
);


// ============================================================================
// PROFESIONAL: HISTORIAL DEL PACIENTE VINCULADO
// ============================================================================
//
// GET /api/health-connect/paciente/:pacienteUid/history?limit=30
//
// ============================================================================

router.get(

  "/paciente/:pacienteUid/history",

  verifyFirebaseToken,

  getPatientHealthHistory
);


// ============================================================================
// USUARIO: ELIMINAR SU PROPIO REGISTRO
// ============================================================================

router.delete(

  "/:id",

  verifyFirebaseToken,

  deleteHealthRecord
);


module.exports =
  router;