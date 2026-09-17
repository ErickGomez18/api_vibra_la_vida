// ============================================================================
// ACCESO A DATOS DE PACIENTES
// ============================================================================
//
// Utilidades reutilizables para comprobar relaciones entre:
//
// especialista <-> paciente
//
// Este archivo será utilizado también por los próximos endpoints:
//
// - Health Connect del paciente
// - medicamentos
// - adherencia
// - bitácora
// - laboratorios
// - resultados
//
// ============================================================================


// ============================================================================
// FIREBASE
// ============================================================================

const {
  db,
} = require("../config/firebase");


// ============================================================================
// ID DETERMINÍSTICO
// ============================================================================

function crearRelacionId(
  especialistaUid,
  pacienteUid
) {

  return `${especialistaUid}_${pacienteUid}`;
}


// ============================================================================
// RELACIÓN ACTIVA
// ============================================================================

async function tieneRelacionActiva(
  especialistaUid,
  pacienteUid
) {

  if (
    !especialistaUid ||
    !pacienteUid
  ) {

    return false;
  }


  const relacionId =
    crearRelacionId(

      especialistaUid,

      pacienteUid
    );


  const relacionDoc =
    await db
      .collection("relaciones_especialista_paciente")
      .doc(relacionId)
      .get();


  if (
    !relacionDoc.exists
  ) {

    return false;
  }


  const relacion =
    relacionDoc.data();


  return (
    relacion.especialistaUid === especialistaUid &&
    relacion.pacienteUid === pacienteUid &&
    relacion.estado === "activa"
  );
}


// ============================================================================
// EXPORTAR
// ============================================================================

module.exports = {

  crearRelacionId,

  tieneRelacionActiva,
};
