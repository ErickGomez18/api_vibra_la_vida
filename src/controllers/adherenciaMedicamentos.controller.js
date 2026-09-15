// ============================================================================
// ADHERENCIA DE MEDICAMENTOS - CONTROLLER
// ============================================================================
//
// Registra lo que el paciente REPORTA sobre cada dosis programada.
//
// Estados permitidos:
// - tomado
// - omitido
//
// IMPORTANTE:
// El sistema no afirma que el medicamento fue ingerido físicamente.
// Guarda únicamente lo que el paciente reportó.
//
// Firestore:
//
// usuarios/{uid}/adherenciaMedicamentos/{registroId}
//
// ============================================================================

const {
  db,
  FieldValue,
} = require("../config/firebase");


// ============================================================================
// CREAR ID DETERMINÍSTICO
// ============================================================================
//
// Evita que el mismo horario del mismo medicamento se marque dos veces.
//
// Ejemplo:
//
// MEDICAMENTO123_20260915_0800
//
// ============================================================================

function crearRegistroId(
  medicamentoId,
  fecha,
  horarioProgramado
) {

  const limpiar =
    (valor = "") =>
      String(valor)
        .replace(/[^a-zA-Z0-9_-]/g, "");


  return [
    limpiar(medicamentoId),
    limpiar(fecha),
    limpiar(horarioProgramado),
  ].join("_");
}


// ============================================================================
// OBTENER REGISTROS
// ============================================================================
//
// GET /api/adherencia-medicamentos
//
// Devuelve el historial reportado por el paciente autenticado.
//
// ============================================================================

async function obtenerAdherencia(
  req,
  res
) {

  try {

    const uid =
      req.user?.uid;


    if (!uid) {

      return res.status(401).json({

        success:
          false,

        message:
          "Usuario no autenticado.",
      });
    }


    const snapshot =
      await db
        .collection("usuarios")
        .doc(uid)
        .collection("adherenciaMedicamentos")
        .get();


    const registros =
      snapshot.docs.map(
        doc => ({

          id:
            doc.id,

          ...doc.data(),
        })
      );


    // Ordenamos de forma descendente utilizando fechaHoraProgramadaMs
    // cuando esté disponible.

    registros.sort(
      (a, b) =>
        Number(b.fechaHoraProgramadaMs || 0) -
        Number(a.fechaHoraProgramadaMs || 0)
    );


    return res.status(200).json({

      success:
        true,

      registros,
    });


  } catch (error) {

    console.error(
      "Error al obtener adherencia:",
      error
    );


    return res.status(500).json({

      success:
        false,

      message:
        "No fue posible obtener el historial de medicamentos.",

      error:
        error.message,
    });
  }
}


// ============================================================================
// REGISTRAR / ACTUALIZAR ESTADO
// ============================================================================
//
// POST /api/adherencia-medicamentos
//
// Body:
//
// {
//   "medicamentoId": "...",
//   "nombreMedicamento": "Metformina",
//   "dosis": "500 mg",
//   "fecha": "15/09/2026",
//   "horarioProgramado": "08:00",
//   "fechaHoraProgramadaMs": 1789452000000,
//   "estado": "tomado"
// }
//
// ============================================================================

async function registrarAdherencia(
  req,
  res
) {

  try {

    const uid =
      req.user?.uid;


    if (!uid) {

      return res.status(401).json({

        success:
          false,

        message:
          "Usuario no autenticado.",
      });
    }


    const body =
      req.body || {};


    const medicamentoId =
      String(
        body.medicamentoId || ""
      ).trim();


    const nombreMedicamento =
      String(
        body.nombreMedicamento || ""
      ).trim();


    const dosis =
      String(
        body.dosis || ""
      ).trim();


    const fecha =
      String(
        body.fecha || ""
      ).trim();


    const horarioProgramado =
      String(
        body.horarioProgramado || ""
      ).trim();


    const estado =
      String(
        body.estado || ""
      )
        .trim()
        .toLowerCase();


    const fechaHoraProgramadaMs =
      Number(
        body.fechaHoraProgramadaMs || 0
      );


    // ------------------------------------------------------------------------
    // VALIDACIONES
    // ------------------------------------------------------------------------

    if (
      !medicamentoId ||
      !nombreMedicamento ||
      !fecha ||
      !horarioProgramado
    ) {

      return res.status(400).json({

        success:
          false,

        message:
          "Medicamento, fecha y horario son obligatorios.",
      });
    }


    if (
      ![
        "tomado",
        "omitido",
      ].includes(
        estado
      )
    ) {

      return res.status(400).json({

        success:
          false,

        message:
          "El estado debe ser tomado u omitido.",
      });
    }


    const registroId =
      crearRegistroId(

        medicamentoId,

        fecha,

        horarioProgramado
      );


    const registroRef =
      db
        .collection("usuarios")
        .doc(uid)
        .collection("adherenciaMedicamentos")
        .doc(registroId);


    const registro = {

      medicamentoId,

      nombreMedicamento,

      dosis,

      fecha,

      horarioProgramado,

      fechaHoraProgramadaMs,

      estado,

      // Campo explícito para recordar que es autorreporte.
      fuente:
        "autorreporte_paciente",

      reportadoEn:
        FieldValue.serverTimestamp(),

      actualizadoEn:
        FieldValue.serverTimestamp(),
    };


    await registroRef.set(

      registro,

      {
        merge:
          true,
      }
    );


    const guardado =
      await registroRef.get();


    return res.status(200).json({

      success:
        true,

      registro: {

        id:
          guardado.id,

        ...guardado.data(),
      },
    });


  } catch (error) {

    console.error(
      "Error al registrar adherencia:",
      error
    );


    return res.status(500).json({

      success:
        false,

      message:
        "No fue posible registrar el estado del medicamento.",

      error:
        error.message,
    });
  }
}


// ============================================================================
// EXPORTAR
// ============================================================================

module.exports = {

  obtenerAdherencia,

  registrarAdherencia,
};
