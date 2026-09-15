// ============================================================================
// RESPUESTA DEL PACIENTE A UNA CITA - CONTROLLER
// ============================================================================
//
// Permite que el paciente:
//
// 1. Confirme su asistencia.
// 2. Solicite reagendar.
// 3. Solicite cancelar.
//
// IMPORTANTE:
//
// El paciente NO modifica directamente la fecha/hora ni cancela la cita.
// Cuando solicita reagendar o cancelar, únicamente se guarda una solicitud
// para que el profesional la revise desde el panel web.
//
// ============================================================================

const {
  db,
  FieldValue,
} = require("../config/firebase");


// ============================================================================
// ACTUALIZAR RESPUESTA DEL PACIENTE
// ============================================================================
//
// PATCH /api/citas/:id/respuesta-paciente
//
// Body para confirmar:
//
// {
//   "accion": "confirmar"
// }
//
// Body para reagendar:
//
// {
//   "accion": "reagendar",
//   "motivo": "No puedo asistir",
//   "fechaSolicitada": "20/09/2026",
//   "horaSolicitada": "16:00"
// }
//
// Body para cancelar:
//
// {
//   "accion": "cancelar",
//   "motivo": "No podré asistir"
// }
//
// ============================================================================

async function actualizarRespuestaPaciente(
  req,
  res
) {

  try {

    const uid =
      req.user?.uid;


    const citaId =
      req.params?.id;


    const body =
      req.body || {};


    const accion =
      String(
        body.accion || ""
      )
        .trim()
        .toLowerCase();


    const motivo =
      String(
        body.motivo || ""
      ).trim();


    const fechaSolicitada =
      String(
        body.fechaSolicitada || ""
      ).trim();


    const horaSolicitada =
      String(
        body.horaSolicitada || ""
      ).trim();


    // ------------------------------------------------------------------------
    // VALIDAR SESIÓN
    // ------------------------------------------------------------------------

    if (
      !uid
    ) {

      return res.status(401).json({

        success:
          false,

        message:
          "Usuario no autenticado.",
      });
    }


    // ------------------------------------------------------------------------
    // VALIDAR CITA
    // ------------------------------------------------------------------------

    if (
      !citaId
    ) {

      return res.status(400).json({

        success:
          false,

        message:
          "El identificador de la cita es obligatorio.",
      });
    }


    // ------------------------------------------------------------------------
    // VALIDAR ACCIÓN
    // ------------------------------------------------------------------------

    if (
      ![
        "confirmar",
        "reagendar",
        "cancelar",
      ].includes(
        accion
      )
    ) {

      return res.status(400).json({

        success:
          false,

        message:
          "La acción debe ser confirmar, reagendar o cancelar.",
      });
    }


    // ------------------------------------------------------------------------
    // REAGENDAR REQUIERE FECHA Y HORA
    // ------------------------------------------------------------------------

    if (
      accion === "reagendar" &&
      (
        !fechaSolicitada ||
        !horaSolicitada
      )
    ) {

      return res.status(400).json({

        success:
          false,

        message:
          "Para solicitar reagendación debes indicar fecha y hora.",
      });
    }


    // ------------------------------------------------------------------------
    // BUSCAR CITA
    // ------------------------------------------------------------------------

    const citaRef =
      db
        .collection("citas")
        .doc(citaId);


    const citaSnapshot =
      await citaRef.get();


    if (
      !citaSnapshot.exists
    ) {

      return res.status(404).json({

        success:
          false,

        message:
          "La cita no existe.",
      });
    }


    const cita =
      citaSnapshot.data();


    // ------------------------------------------------------------------------
    // VALIDAR QUE LA CITA PERTENECE AL PACIENTE
    // ------------------------------------------------------------------------

    if (
      cita?.pacienteUid !== uid
    ) {

      return res.status(403).json({

        success:
          false,

        message:
          "No tienes permiso para modificar esta cita.",
      });
    }


    // ------------------------------------------------------------------------
    // EVITAR CAMBIOS SOBRE CITAS FINALIZADAS
    // ------------------------------------------------------------------------

    const estadoCita =
      String(
        cita?.estado || ""
      )
        .trim()
        .toLowerCase();


    if (
      [
        "completada",
        "cancelada",
      ].includes(
        estadoCita
      )
    ) {

      return res.status(409).json({

        success:
          false,

        message:
          "Esta cita ya no admite cambios del paciente.",
      });
    }


    // ========================================================================
    // CONFIRMAR ASISTENCIA
    // ========================================================================

    if (
      accion === "confirmar"
    ) {

      await citaRef.update({

        estadoPaciente:
          "confirmada",

        solicitudCambio:
          null,

        respuestaPacienteActualizadaEn:
          FieldValue.serverTimestamp(),

        actualizadoEn:
          FieldValue.serverTimestamp(),
      });
    }


    // ========================================================================
    // SOLICITAR REAGENDAR
    // ========================================================================

    if (
      accion === "reagendar"
    ) {

      await citaRef.update({

        estadoPaciente:
          "solicitud_reagendar",

        solicitudCambio: {

          tipo:
            "reagendar",

          motivo,

          fechaSolicitada,

          horaSolicitada,

          estado:
            "pendiente",

          solicitadoEn:
            FieldValue.serverTimestamp(),
        },

        respuestaPacienteActualizadaEn:
          FieldValue.serverTimestamp(),

        actualizadoEn:
          FieldValue.serverTimestamp(),
      });
    }


    // ========================================================================
    // SOLICITAR CANCELAR
    // ========================================================================

    if (
      accion === "cancelar"
    ) {

      await citaRef.update({

        estadoPaciente:
          "solicitud_cancelar",

        solicitudCambio: {

          tipo:
            "cancelar",

          motivo,

          estado:
            "pendiente",

          solicitadoEn:
            FieldValue.serverTimestamp(),
        },

        respuestaPacienteActualizadaEn:
          FieldValue.serverTimestamp(),

        actualizadoEn:
          FieldValue.serverTimestamp(),
      });
    }


    // ------------------------------------------------------------------------
    // DEVOLVER CITA ACTUALIZADA
    // ------------------------------------------------------------------------

    const actualizada =
      await citaRef.get();


    return res.status(200).json({

      success:
        true,

      message:
        accion === "confirmar"
          ? "Asistencia confirmada."
          : accion === "reagendar"
            ? "Solicitud de reagendación enviada."
            : "Solicitud de cancelación enviada.",

      cita: {

        id:
          actualizada.id,

        ...actualizada.data(),
      },
    });


  } catch (error) {

    console.error(
      "Error al actualizar respuesta del paciente:",
      error
    );


    return res.status(500).json({

      success:
        false,

      message:
        "No fue posible actualizar la respuesta del paciente.",

      error:
        error.message,
    });
  }
}


// ============================================================================
// EXPORTAR
// ============================================================================

module.exports = {

  actualizarRespuestaPaciente,
};
