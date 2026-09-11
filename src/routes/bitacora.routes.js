// ============================================================================
// BITÁCORA ROUTES
// ============================================================================

const express =
  require("express");


const {

  getRegistrosSalud,

  createRegistroSalud,

  updateRegistroSalud,

  deleteRegistroSalud,

  getLaboratorios,

  createLaboratorio,

  updateLaboratorio,

  deleteLaboratorio,

} =
  require("../controllers/bitacora.controller");


const {
  verifyFirebaseToken,
} =
  require("../middlewares/auth.middleware");


const router =
  express.Router();


// ============================================================================
// REGISTROS DE SALUD
// ============================================================================

router.get(
  "/registros",
  verifyFirebaseToken,
  getRegistrosSalud
);


router.post(
  "/registros",
  verifyFirebaseToken,
  createRegistroSalud
);


router.put(
  "/registros/:id",
  verifyFirebaseToken,
  updateRegistroSalud
);


router.delete(
  "/registros/:id",
  verifyFirebaseToken,
  deleteRegistroSalud
);


// ============================================================================
// LABORATORIOS
// ============================================================================

router.get(
  "/laboratorios",
  verifyFirebaseToken,
  getLaboratorios
);


router.post(
  "/laboratorios",
  verifyFirebaseToken,
  createLaboratorio
);


router.put(
  "/laboratorios/:id",
  verifyFirebaseToken,
  updateLaboratorio
);


router.delete(
  "/laboratorios/:id",
  verifyFirebaseToken,
  deleteLaboratorio
);


// ============================================================================
// EXPORTAR
// ============================================================================

module.exports =
  router;