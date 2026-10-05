// ============================================================================
// PROFESIONALES MAPA ROUTES
// ============================================================================

const express =
  require(
    "express"
  );


const {
  obtenerProfesionalesMapa,
} =
  require(
    "../controllers/profesionalesMapa.controller"
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
// GET /API/PROFESIONALES/MAPA
// ============================================================================
//
// Requiere token de Firebase.
//
// Devuelve únicamente profesionales que tienen:
//
// - consultorio;
// - latitud válida;
// - longitud válida.
//
// ============================================================================

router.get(

  "/mapa",

  verifyFirebaseToken,

  obtenerProfesionalesMapa
);


// ============================================================================
// EXPORTAR
// ============================================================================

module.exports =
  router;
