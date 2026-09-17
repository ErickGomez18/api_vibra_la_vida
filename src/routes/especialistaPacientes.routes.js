// ============================================================================
// RUTAS - RELACIÓN ESPECIALISTA / PACIENTE
// ============================================================================


// ============================================================================
// EXPRESS
// ============================================================================

const express =
  require("express");


// ============================================================================
// AUTENTICACIÓN
// ============================================================================

const {
  verifyFirebaseToken,
} =
  require("../middlewares/auth.middleware");


// ============================================================================
// CONTROLADOR
// ============================================================================

const {

  crearSolicitud,

  obtenerSolicitudesPaciente,

  responderSolicitud,

  obtenerMisPacientes,

  obtenerResumenPaciente,

  obtenerHealthConnectPaciente,

  obtenerMedicamentosPaciente,

  obtenerAdherenciaPaciente,

  obtenerRegistrosSaludPaciente,

  obtenerLaboratoriosPaciente,

  obtenerResultadosPaciente,

  obtenerCitasPaciente,

  desvincular,

} =
  require(
    "../controllers/especialistaPacientes.controller"
  );


// ============================================================================
// ROUTER
// ============================================================================

const router =
  express.Router();


// ============================================================================
// CREAR SOLICITUD
// ============================================================================

router.post(

  "/solicitudes",

  verifyFirebaseToken,

  crearSolicitud
);


// ============================================================================
// SOLICITUDES PENDIENTES DEL PACIENTE
// ============================================================================

router.get(

  "/solicitudes-paciente",

  verifyFirebaseToken,

  obtenerSolicitudesPaciente
);


// ============================================================================
// RESPONDER SOLICITUD
// ============================================================================

router.patch(

  "/solicitudes/:id/respuesta",

  verifyFirebaseToken,

  responderSolicitud
);


// ============================================================================
// PACIENTES VINCULADOS DEL ESPECIALISTA
// ============================================================================

router.get(

  "/mis-pacientes",

  verifyFirebaseToken,

  obtenerMisPacientes
);


// ============================================================================
// RESUMEN DEL PACIENTE
// ============================================================================
//
// GET /api/especialista-pacientes/:pacienteUid/resumen
//
// Requiere relación activa.
//
// ============================================================================

router.get(

  "/:pacienteUid/resumen",

  verifyFirebaseToken,

  obtenerResumenPaciente
);


// ============================================================================
// HEALTH CONNECT DEL PACIENTE
// ============================================================================
//
// GET /api/especialista-pacientes/:pacienteUid/health-connect
//
// Opcional:
//
// ?limit=30
//
// Requiere relación activa.
//
// ============================================================================

router.get(

  "/:pacienteUid/health-connect",

  verifyFirebaseToken,

  obtenerHealthConnectPaciente
);


// ============================================================================
// MEDICAMENTOS DEL PACIENTE
// ============================================================================

router.get(

  "/:pacienteUid/medicamentos",

  verifyFirebaseToken,

  obtenerMedicamentosPaciente
);


// ============================================================================
// ADHERENCIA DEL PACIENTE
// ============================================================================

router.get(

  "/:pacienteUid/adherencia-medicamentos",

  verifyFirebaseToken,

  obtenerAdherenciaPaciente
);


// ============================================================================
// REGISTROS DE SALUD
// ============================================================================

router.get(

  "/:pacienteUid/bitacora/registros",

  verifyFirebaseToken,

  obtenerRegistrosSaludPaciente
);


// ============================================================================
// LABORATORIOS
// ============================================================================

router.get(

  "/:pacienteUid/bitacora/laboratorios",

  verifyFirebaseToken,

  obtenerLaboratoriosPaciente
);


// ============================================================================
// RESULTADOS / EVALUACIONES
// ============================================================================

router.get(

  "/:pacienteUid/resultados",

  verifyFirebaseToken,

  obtenerResultadosPaciente
);


// ============================================================================
// CITAS COMPARTIDAS
// ============================================================================

router.get(

  "/:pacienteUid/citas",

  verifyFirebaseToken,

  obtenerCitasPaciente
);


// ============================================================================
// FINALIZAR RELACIÓN
// ============================================================================
//
// Especialista:
// DELETE /api/especialista-pacientes/{pacienteUid}
//
// Paciente:
// en una futura pantalla se puede utilizar el mismo endpoint enviando
// el UID del especialista.
//
// ============================================================================

router.delete(

  "/:pacienteUid",

  verifyFirebaseToken,

  desvincular
);


// ============================================================================
// EXPORTAR
// ============================================================================

module.exports =
  router;
