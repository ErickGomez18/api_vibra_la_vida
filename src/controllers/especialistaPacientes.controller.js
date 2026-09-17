// ============================================================================
// RELACIONES ESPECIALISTA - PACIENTE
// ============================================================================
//
// Este controlador maneja el vínculo seguro entre:
//
// especialista <-> paciente
//
// REGLA:
//
// Un especialista NO obtiene acceso a los datos de salud de una persona
// solamente por conocer su UID.
//
// Primero:
//
// 1. El especialista envía una solicitud.
// 2. El paciente la acepta.
// 3. La relación cambia a "activa".
// 4. Solamente una relación activa podrá utilizarse después para consultar
//    datos clínicos / wearables del paciente.
//
// COLECCIÓN:
//
// relaciones_especialista_paciente/{especialistaUid}_{pacienteUid}
//
// ============================================================================


// ============================================================================
// FIREBASE
// ============================================================================

const {
  db,
  FieldValue,
} = require("../config/firebase");


// ============================================================================
// ROLES
// ============================================================================

const {
  normalizarRoles,
} = require("../utils/roles.utils");


// ============================================================================
// UTILIDADES
// ============================================================================

const {
  crearRelacionId,
  tieneRelacionActiva,
} = require("../utils/accesoPaciente.utils");


// ============================================================================
// OBTENER USUARIO
// ============================================================================

async function obtenerUsuario(
  uid
) {

  const snapshot =
    await db
      .collection("usuarios")
      .doc(uid)
      .get();


  if (
    !snapshot.exists
  ) {

    return null;
  }


  return {

    id:
      snapshot.id,

    ...snapshot.data(),
  };
}


// ============================================================================
// COMPROBAR ESPECIALISTA
// ============================================================================

function usuarioEsEspecialista(
  usuario
) {

  const roles =
    normalizarRoles(

      usuario?.roles,

      usuario?.rol
    );


  return roles.includes(
    "especialista"
  );
}


// ============================================================================
// COMPROBAR PACIENTE
// ============================================================================

function usuarioEsPaciente(
  usuario
) {

  const roles =
    normalizarRoles(

      usuario?.roles,

      usuario?.rol
    );


  return roles.includes(
    "paciente"
  );
}



// ============================================================================
// VALIDAR ACCESO DEL ESPECIALISTA AL PACIENTE
// ============================================================================
//
// Centralizamos esta comprobación para los endpoints que devuelven
// información del paciente.
//
// Requiere:
//
// 1. Usuario autenticado.
// 2. Rol especialista.
// 3. Relación especialista-paciente con estado "activa".
//
// ============================================================================

async function validarAccesoEspecialistaPaciente(
  especialistaUid,
  pacienteUid
) {

  const especialista =
    await obtenerUsuario(
      especialistaUid
    );


  if (
    !especialista ||
    !usuarioEsEspecialista(
      especialista
    )
  ) {

    return {

      autorizado:
        false,

      status:
        403,

      message:
        "Esta acción requiere una cuenta de especialista.",
    };
  }


  const paciente =
    await obtenerUsuario(
      pacienteUid
    );


  if (
    !paciente ||
    !usuarioEsPaciente(
      paciente
    )
  ) {

    return {

      autorizado:
        false,

      status:
        404,

      message:
        "No se encontró el perfil del paciente.",
    };
  }


  const relacionActiva =
    await tieneRelacionActiva(

      especialistaUid,

      pacienteUid
    );


  if (
    !relacionActiva
  ) {

    return {

      autorizado:
        false,

      status:
        403,

      code:
        "RELACION_NO_ACTIVA",

      message:
        "No tienes una relación activa con este paciente.",
    };
  }


  return {

    autorizado:
      true,

    especialista,

    paciente,
  };
}


// ============================================================================
// CREAR SOLICITUD
// ============================================================================
//
// POST /api/especialista-pacientes/solicitudes
//
// BODY:
//
// {
//   "pacienteUid": "..."
// }
//
// Solo especialista.
//
// ============================================================================

async function crearSolicitud(
  req,
  res
) {

  try {

    const especialistaUid =
      req.user?.uid;


    if (
      !especialistaUid
    ) {

      return res
        .status(401)
        .json({

          success:
            false,

          message:
            "No se pudo identificar al usuario autenticado.",
        });
    }


    const especialista =
      await obtenerUsuario(
        especialistaUid
      );


    if (
      !especialista ||
      !usuarioEsEspecialista(
        especialista
      )
    ) {

      return res
        .status(403)
        .json({

          success:
            false,

          message:
            "Esta acción requiere una cuenta de especialista.",
        });
    }


    const pacienteUid =
      String(
        req.body?.pacienteUid || ""
      ).trim();


    if (
      !pacienteUid
    ) {

      return res
        .status(400)
        .json({

          success:
            false,

          message:
            "El paciente es obligatorio.",
        });
    }


    if (
      pacienteUid === especialistaUid
    ) {

      return res
        .status(400)
        .json({

          success:
            false,

          message:
            "No puedes enviarte una solicitud a ti mismo.",
        });
    }


    // ========================================================================
    // VALIDAR QUE EXISTA EN EL DIRECTORIO DE PACIENTES
    // ========================================================================

    const directorioDoc =
      await db
        .collection("directorio_pacientes")
        .doc(pacienteUid)
        .get();


    if (
      !directorioDoc.exists
    ) {

      return res
        .status(404)
        .json({

          success:
            false,

          message:
            "No se encontró al paciente en el directorio.",
        });
    }


    const paciente =
      await obtenerUsuario(
        pacienteUid
      );


    if (
      !paciente ||
      !usuarioEsPaciente(
        paciente
      )
    ) {

      return res
        .status(404)
        .json({

          success:
            false,

          message:
            "El usuario seleccionado no tiene perfil de paciente.",
        });
    }


    const relacionId =
      crearRelacionId(

        especialistaUid,

        pacienteUid
      );


    const relacionRef =
      db
        .collection("relaciones_especialista_paciente")
        .doc(relacionId);


    const relacionDoc =
      await relacionRef.get();


    // ========================================================================
    // RELACIÓN YA EXISTENTE
    // ========================================================================

    if (
      relacionDoc.exists
    ) {

      const relacion =
        relacionDoc.data();


      if (
        relacion.estado ===
        "activa"
      ) {

        return res
          .status(409)
          .json({

            success:
              false,

            code:
              "RELACION_YA_ACTIVA",

            message:
              "Este paciente ya está vinculado contigo.",
          });
      }


      if (
        relacion.estado ===
        "pendiente"
      ) {

        return res
          .status(409)
          .json({

            success:
              false,

            code:
              "SOLICITUD_YA_PENDIENTE",

            message:
              "Ya existe una solicitud pendiente para este paciente.",
          });
      }
    }


    // ========================================================================
    // NOMBRES
    // ========================================================================

    const nombreEspecialista =
      especialista.nombreCompleto ||
      especialista.nombre ||
      "Especialista";


    const nombrePaciente =
      paciente.nombreCompleto ||
      paciente.nombre ||
      directorioDoc.data()?.nombreCompleto ||
      "Paciente";


    // ========================================================================
    // GUARDAR SOLICITUD
    // ========================================================================

    const datos = {

      id:
        relacionId,

      especialistaUid,

      pacienteUid,

      nombreEspecialista,

      nombrePaciente,

      estado:
        "pendiente",

      solicitadoPor:
        especialistaUid,

      respondidoPor:
        null,

      fechaSolicitud:
        FieldValue.serverTimestamp(),

      fechaRespuesta:
        null,

      actualizadoEn:
        FieldValue.serverTimestamp(),
    };


    await relacionRef.set(

      datos,

      {
        merge:
          true,
      }
    );


    return res
      .status(201)
      .json({

        success:
          true,

        message:
          "Solicitud enviada al paciente.",

        relacion: {

          ...datos,

          // Los ServerTimestamp todavía no tienen valor local
          // inmediatamente después de set().
          fechaSolicitud:
            null,

          actualizadoEn:
            null,
        },
      });


  } catch (
    error
  ) {

    console.error(
      "Error en crearSolicitud:",
      error
    );


    return res
      .status(500)
      .json({

        success:
          false,

        message:
          "No fue posible enviar la solicitud.",

        error:
          error.message,
      });
  }
}


// ============================================================================
// SOLICITUDES DEL PACIENTE
// ============================================================================
//
// GET /api/especialista-pacientes/solicitudes-paciente
//
// Devuelve solicitudes pendientes dirigidas al usuario autenticado.
//
// ============================================================================

async function obtenerSolicitudesPaciente(
  req,
  res
) {

  try {

    const pacienteUid =
      req.user?.uid;


    if (
      !pacienteUid
    ) {

      return res
        .status(401)
        .json({

          success:
            false,

          message:
            "No se pudo identificar al usuario autenticado.",
        });
    }


    const paciente =
      await obtenerUsuario(
        pacienteUid
      );


    if (
      !paciente ||
      !usuarioEsPaciente(
        paciente
      )
    ) {

      return res
        .status(403)
        .json({

          success:
            false,

          message:
            "Esta acción requiere un perfil de paciente.",
        });
    }


    const snapshot =
      await db
        .collection("relaciones_especialista_paciente")
        .where(
          "pacienteUid",
          "==",
          pacienteUid
        )
        .where(
          "estado",
          "==",
          "pendiente"
        )
        .get();


    const solicitudes =
      snapshot.docs

        .map(
          doc => ({

            id:
              doc.id,

            ...doc.data(),
          })
        )

        .sort(
          (
            a,
            b
          ) => {

            const aMs =
              a.fechaSolicitud
                ?.toMillis?.() || 0;

            const bMs =
              b.fechaSolicitud
                ?.toMillis?.() || 0;


            return bMs - aMs;
          }
        );


    return res.json({

      success:
        true,

      count:
        solicitudes.length,

      solicitudes,
    });


  } catch (
    error
  ) {

    console.error(
      "Error en obtenerSolicitudesPaciente:",
      error
    );


    return res
      .status(500)
      .json({

        success:
          false,

        message:
          "No fue posible obtener las solicitudes.",

        error:
          error.message,
      });
  }
}


// ============================================================================
// RESPONDER SOLICITUD
// ============================================================================
//
// PATCH /api/especialista-pacientes/solicitudes/:id/respuesta
//
// BODY:
//
// { "accion": "aceptar" }
//
// o:
//
// { "accion": "rechazar" }
//
// Solamente el paciente propietario puede responder.
//
// ============================================================================

async function responderSolicitud(
  req,
  res
) {

  try {

    const pacienteUid =
      req.user?.uid;


    const relacionId =
      req.params.id;


    const accion =
      String(
        req.body?.accion || ""
      )
        .trim()
        .toLowerCase();


    if (
      ![
        "aceptar",
        "rechazar",
      ].includes(
        accion
      )
    ) {

      return res
        .status(400)
        .json({

          success:
            false,

          message:
            "La acción debe ser 'aceptar' o 'rechazar'.",
        });
    }


    const relacionRef =
      db
        .collection("relaciones_especialista_paciente")
        .doc(relacionId);


    const relacionDoc =
      await relacionRef.get();


    if (
      !relacionDoc.exists
    ) {

      return res
        .status(404)
        .json({

          success:
            false,

          message:
            "La solicitud no existe.",
        });
    }


    const relacion =
      relacionDoc.data();


    if (
      relacion.pacienteUid !==
      pacienteUid
    ) {

      return res
        .status(403)
        .json({

          success:
            false,

          message:
            "No puedes responder una solicitud dirigida a otro paciente.",
        });
    }


    if (
      relacion.estado !==
      "pendiente"
    ) {

      return res
        .status(409)
        .json({

          success:
            false,

          message:
            "Esta solicitud ya fue respondida.",
        });
    }


    const nuevoEstado =
      accion === "aceptar"
        ? "activa"
        : "rechazada";


    await relacionRef.update({

      estado:
        nuevoEstado,

      respondidoPor:
        pacienteUid,

      fechaRespuesta:
        FieldValue.serverTimestamp(),

      actualizadoEn:
        FieldValue.serverTimestamp(),
    });


    return res.json({

      success:
        true,

      message:
        accion === "aceptar"
          ? "Especialista vinculado correctamente."
          : "Solicitud rechazada.",

      estado:
        nuevoEstado,
    });


  } catch (
    error
  ) {

    console.error(
      "Error en responderSolicitud:",
      error
    );


    return res
      .status(500)
      .json({

        success:
          false,

        message:
          "No fue posible responder la solicitud.",

        error:
          error.message,
      });
  }
}


// ============================================================================
// PACIENTES DEL ESPECIALISTA
// ============================================================================
//
// GET /api/especialista-pacientes/mis-pacientes
//
// Solo devuelve relaciones ACTIVAS.
//
// ============================================================================

async function obtenerMisPacientes(
  req,
  res
) {

  try {

    const especialistaUid =
      req.user?.uid;


    const especialista =
      await obtenerUsuario(
        especialistaUid
      );


    if (
      !especialista ||
      !usuarioEsEspecialista(
        especialista
      )
    ) {

      return res
        .status(403)
        .json({

          success:
            false,

          message:
            "Esta acción requiere una cuenta de especialista.",
        });
    }


    const snapshot =
      await db
        .collection("relaciones_especialista_paciente")
        .where(
          "especialistaUid",
          "==",
          especialistaUid
        )
        .where(
          "estado",
          "==",
          "activa"
        )
        .get();


    const pacientes =
      snapshot.docs.map(
        doc => {

          const relacion =
            doc.data();


          return {

            relacionId:
              doc.id,

            pacienteUid:
              relacion.pacienteUid,

            nombrePaciente:
              relacion.nombrePaciente,

            fechaVinculacion:
              relacion.fechaRespuesta || null,
          };
        }
      );


    return res.json({

      success:
        true,

      count:
        pacientes.length,

      pacientes,
    });


  } catch (
    error
  ) {

    console.error(
      "Error en obtenerMisPacientes:",
      error
    );


    return res
      .status(500)
      .json({

        success:
          false,

        message:
          "No fue posible obtener los pacientes vinculados.",

        error:
          error.message,
      });
  }
}


// ============================================================================
// DESVINCULAR
// ============================================================================
//
// DELETE /api/especialista-pacientes/:pacienteUid
//
// Tanto especialista como paciente pueden finalizar una relación activa.
//
// Esto NO elimina la cuenta ni los datos de salud.
//
// ============================================================================

async function desvincular(
  req,
  res
) {

  try {

    const uid =
      req.user?.uid;


    const pacienteUidParametro =
      String(
        req.params.pacienteUid || ""
      ).trim();


    const usuario =
      await obtenerUsuario(
        uid
      );


    if (
      !usuario
    ) {

      return res
        .status(404)
        .json({

          success:
            false,

          message:
            "No se encontró el perfil del usuario.",
        });
    }


    const esEspecialista =
      usuarioEsEspecialista(
        usuario
      );


    let relacionId;


    if (
      esEspecialista
    ) {

      relacionId =
        crearRelacionId(

          uid,

          pacienteUidParametro
        );

    } else {

      // En el lado del paciente, :pacienteUid se interpreta
      // como el UID del especialista para permitir que el mismo endpoint
      // sea reutilizable en el futuro.
      relacionId =
        crearRelacionId(

          pacienteUidParametro,

          uid
        );
    }


    const relacionRef =
      db
        .collection("relaciones_especialista_paciente")
        .doc(relacionId);


    const relacionDoc =
      await relacionRef.get();


    if (
      !relacionDoc.exists
    ) {

      return res
        .status(404)
        .json({

          success:
            false,

          message:
            "No se encontró la relación.",
        });
    }


    const relacion =
      relacionDoc.data();


    if (
      uid !== relacion.especialistaUid &&
      uid !== relacion.pacienteUid
    ) {

      return res
        .status(403)
        .json({

          success:
            false,

          message:
            "No tienes permiso para modificar esta relación.",
        });
    }


    await relacionRef.update({

      estado:
        "finalizada",

      finalizadoPor:
        uid,

      fechaFinalizacion:
        FieldValue.serverTimestamp(),

      actualizadoEn:
        FieldValue.serverTimestamp(),
    });


    return res.json({

      success:
        true,

      message:
        "Relación finalizada correctamente.",
    });


  } catch (
    error
  ) {

    console.error(
      "Error en desvincular:",
      error
    );


    return res
      .status(500)
      .json({

        success:
          false,

        message:
          "No fue posible finalizar la relación.",

        error:
          error.message,
      });
  }
}




// ============================================================================
// RESUMEN DEL PACIENTE
// ============================================================================
//
// GET /api/especialista-pacientes/:pacienteUid/resumen
//
// SOLO PARA ESPECIALISTAS CON RELACIÓN ACTIVA.
//
// Devuelve:
//
// - datos básicos del perfil;
// - antecedentes declarados por el paciente;
// - último registro diario de Health Connect.
//
// NO devuelve:
//
// - correo;
// - tokens;
// - campos internos de autenticación.
//
// ============================================================================

async function obtenerResumenPaciente(
  req,
  res
) {

  try {

    const especialistaUid =
      req.user?.uid;


    const pacienteUid =
      String(
        req.params.pacienteUid || ""
      ).trim();


    if (
      !especialistaUid
    ) {

      return res
        .status(401)
        .json({

          success:
            false,

          message:
            "No se pudo identificar al usuario autenticado.",
        });
    }


    if (
      !pacienteUid
    ) {

      return res
        .status(400)
        .json({

          success:
            false,

          message:
            "El paciente es obligatorio.",
        });
    }


    const acceso =
      await validarAccesoEspecialistaPaciente(

        especialistaUid,

        pacienteUid
      );


    if (
      !acceso.autorizado
    ) {

      return res
        .status(
          acceso.status
        )
        .json({

          success:
            false,

          code:
            acceso.code || null,

          message:
            acceso.message,
        });
    }


    const paciente =
      acceso.paciente;


    // ========================================================================
    // ÚLTIMO REGISTRO DE HEALTH CONNECT
    // ========================================================================

    const healthSnapshot =
      await db
        .collection("usuarios")
        .doc(pacienteUid)
        .collection("health_connect")
        .orderBy(
          "fechaSincronizacion",
          "desc"
        )
        .limit(1)
        .get();


    let ultimoHealthConnect =
      null;


    if (
      !healthSnapshot.empty
    ) {

      const healthDoc =
        healthSnapshot.docs[0];


      ultimoHealthConnect = {

        id:
          healthDoc.id,

        ...healthDoc.data(),
      };
    }


    // ========================================================================
    // RESPUESTA CONTROLADA
    // ========================================================================

    return res.json({

      success:
        true,

      paciente: {

        uid:
          pacienteUid,

        nombreCompleto:
          paciente.nombreCompleto ||
          paciente.nombre ||
          "",

        edad:
          paciente.edad ?? null,

        genero:
          paciente.genero ?? null,

        peso:
          paciente.peso ?? null,

        estatura:
          paciente.estatura ?? null,

        nivelActividad:
          paciente.nivelActividad ?? null,

        enfermedadesCronicas:
          Array.isArray(
            paciente.enfermedadesCronicas
          )
            ? paciente.enfermedadesCronicas
            : [],

        otraEnfermedadCronica:
          paciente.otraEnfermedadCronica ?? null,

        ultimoHealthConnect,
      },
    });


  } catch (
    error
  ) {

    console.error(
      "Error en obtenerResumenPaciente:",
      error
    );


    return res
      .status(500)
      .json({

        success:
          false,

        message:
          "No fue posible obtener el resumen del paciente.",

        error:
          error.message,
      });
  }
}


// ============================================================================
// HISTORIAL DE HEALTH CONNECT DEL PACIENTE
// ============================================================================
//
// GET /api/especialista-pacientes/:pacienteUid/health-connect
//
// Opcional:
//
// ?limit=30
//
// Máximo:
// 90 registros.
//
// SOLO PARA ESPECIALISTAS CON RELACIÓN ACTIVA.
//
// ============================================================================

async function obtenerHealthConnectPaciente(
  req,
  res
) {

  try {

    const especialistaUid =
      req.user?.uid;


    const pacienteUid =
      String(
        req.params.pacienteUid || ""
      ).trim();


    if (
      !especialistaUid
    ) {

      return res
        .status(401)
        .json({

          success:
            false,

          message:
            "No se pudo identificar al usuario autenticado.",
        });
    }


    const acceso =
      await validarAccesoEspecialistaPaciente(

        especialistaUid,

        pacienteUid
      );


    if (
      !acceso.autorizado
    ) {

      return res
        .status(
          acceso.status
        )
        .json({

          success:
            false,

          code:
            acceso.code || null,

          message:
            acceso.message,
        });
    }


    // ========================================================================
    // LÍMITE
    // ========================================================================

    const limiteSolicitado =
      Number(
        req.query.limit
      );


    const limite =
      Number.isFinite(
        limiteSolicitado
      ) &&
      limiteSolicitado > 0

        ? Math.min(
            Math.trunc(
              limiteSolicitado
            ),
            90
          )

        : 30;


    // ========================================================================
    // HISTORIAL
    // ========================================================================

    const snapshot =
      await db
        .collection("usuarios")
        .doc(pacienteUid)
        .collection("health_connect")
        .orderBy(
          "fechaSincronizacion",
          "desc"
        )
        .limit(
          limite
        )
        .get();


    const registros =
      snapshot.docs.map(
        doc => ({

          id:
            doc.id,

          ...doc.data(),
        })
      );


    return res.json({

      success:
        true,

      pacienteUid,

      count:
        registros.length,

      registros,
    });


  } catch (
    error
  ) {

    console.error(
      "Error en obtenerHealthConnectPaciente:",
      error
    );


    return res
      .status(500)
      .json({

        success:
          false,

        message:
          "No fue posible obtener los datos de Health Connect del paciente.",

        error:
          error.message,
      });
  }
}




// ============================================================================
// MEDICAMENTOS DEL PACIENTE
// ============================================================================
//
// GET /api/especialista-pacientes/:pacienteUid/medicamentos
//
// Solo especialista con relación ACTIVA.
//
// ============================================================================

async function obtenerMedicamentosPaciente(
  req,
  res
) {

  try {

    const especialistaUid =
      req.user?.uid;


    const pacienteUid =
      String(
        req.params.pacienteUid || ""
      ).trim();


    const acceso =
      await validarAccesoEspecialistaPaciente(

        especialistaUid,

        pacienteUid
      );


    if (
      !acceso.autorizado
    ) {

      return res
        .status(
          acceso.status
        )
        .json({

          success:
            false,

          code:
            acceso.code || null,

          message:
            acceso.message,
        });
    }


    const snapshot =
      await db
        .collection("usuarios")
        .doc(pacienteUid)
        .collection("medicamentos")
        .orderBy(
          "creadoEn",
          "desc"
        )
        .get();


    const medicamentos =
      snapshot.docs.map(
        doc => ({

          id:
            doc.id,

          ...doc.data(),
        })
      );


    return res.json({

      success:
        true,

      pacienteUid,

      medicamentos,
    });


  } catch (
    error
  ) {

    console.error(
      "Error en obtenerMedicamentosPaciente:",
      error
    );


    return res
      .status(500)
      .json({

        success:
          false,

        message:
          "No fue posible obtener los medicamentos del paciente.",

        error:
          error.message,
      });
  }
}


// ============================================================================
// ADHERENCIA DE MEDICAMENTOS DEL PACIENTE
// ============================================================================
//
// GET /api/especialista-pacientes/:pacienteUid/adherencia-medicamentos
//
// Solo especialista con relación ACTIVA.
//
// ============================================================================

async function obtenerAdherenciaPaciente(
  req,
  res
) {

  try {

    const especialistaUid =
      req.user?.uid;


    const pacienteUid =
      String(
        req.params.pacienteUid || ""
      ).trim();


    const acceso =
      await validarAccesoEspecialistaPaciente(

        especialistaUid,

        pacienteUid
      );


    if (
      !acceso.autorizado
    ) {

      return res
        .status(
          acceso.status
        )
        .json({

          success:
            false,

          code:
            acceso.code || null,

          message:
            acceso.message,
        });
    }


    const snapshot =
      await db
        .collection("usuarios")
        .doc(pacienteUid)
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


    registros.sort(
      (
        a,
        b
      ) =>
        Number(
          b.fechaHoraProgramadaMs || 0
        ) -
        Number(
          a.fechaHoraProgramadaMs || 0
        )
    );


    return res.json({

      success:
        true,

      pacienteUid,

      registros,
    });


  } catch (
    error
  ) {

    console.error(
      "Error en obtenerAdherenciaPaciente:",
      error
    );


    return res
      .status(500)
      .json({

        success:
          false,

        message:
          "No fue posible obtener la adherencia del paciente.",

        error:
          error.message,
      });
  }
}


// ============================================================================
// REGISTROS DE SALUD DEL PACIENTE
// ============================================================================
//
// GET /api/especialista-pacientes/:pacienteUid/bitacora/registros
//
// Solo especialista con relación ACTIVA.
//
// ============================================================================

async function obtenerRegistrosSaludPaciente(
  req,
  res
) {

  try {

    const especialistaUid =
      req.user?.uid;


    const pacienteUid =
      String(
        req.params.pacienteUid || ""
      ).trim();


    const acceso =
      await validarAccesoEspecialistaPaciente(

        especialistaUid,

        pacienteUid
      );


    if (
      !acceso.autorizado
    ) {

      return res
        .status(
          acceso.status
        )
        .json({

          success:
            false,

          code:
            acceso.code || null,

          message:
            acceso.message,
        });
    }


    const snapshot =
      await db
        .collection("usuarios")
        .doc(pacienteUid)
        .collection("registrosSalud")
        .orderBy(
          "creadoEn",
          "desc"
        )
        .get();


    const registros =
      snapshot.docs.map(
        doc => ({

          id:
            doc.id,

          ...doc.data(),
        })
      );


    return res.json({

      success:
        true,

      pacienteUid,

      registros,
    });


  } catch (
    error
  ) {

    console.error(
      "Error en obtenerRegistrosSaludPaciente:",
      error
    );


    return res
      .status(500)
      .json({

        success:
          false,

        message:
          "No fue posible obtener la bitácora del paciente.",

        error:
          error.message,
      });
  }
}


// ============================================================================
// LABORATORIOS DEL PACIENTE
// ============================================================================
//
// GET /api/especialista-pacientes/:pacienteUid/bitacora/laboratorios
//
// Solo especialista con relación ACTIVA.
//
// ============================================================================

async function obtenerLaboratoriosPaciente(
  req,
  res
) {

  try {

    const especialistaUid =
      req.user?.uid;


    const pacienteUid =
      String(
        req.params.pacienteUid || ""
      ).trim();


    const acceso =
      await validarAccesoEspecialistaPaciente(

        especialistaUid,

        pacienteUid
      );


    if (
      !acceso.autorizado
    ) {

      return res
        .status(
          acceso.status
        )
        .json({

          success:
            false,

          code:
            acceso.code || null,

          message:
            acceso.message,
        });
    }


    const snapshot =
      await db
        .collection("usuarios")
        .doc(pacienteUid)
        .collection("laboratorios")
        .orderBy(
          "creadoEn",
          "desc"
        )
        .get();


    const laboratorios =
      snapshot.docs.map(
        doc => ({

          id:
            doc.id,

          ...doc.data(),
        })
      );


    return res.json({

      success:
        true,

      pacienteUid,

      laboratorios,
    });


  } catch (
    error
  ) {

    console.error(
      "Error en obtenerLaboratoriosPaciente:",
      error
    );


    return res
      .status(500)
      .json({

        success:
          false,

        message:
          "No fue posible obtener los laboratorios del paciente.",

        error:
          error.message,
      });
  }
}


// ============================================================================
// RESULTADOS / EVALUACIONES DEL PACIENTE
// ============================================================================
//
// GET /api/especialista-pacientes/:pacienteUid/resultados
//
// Opcional:
//
// ?tipo=ais
// ?tipo=imc
// ?tipo=dass_depresion
//
// Solo especialista con relación ACTIVA.
//
// ============================================================================

async function obtenerResultadosPaciente(
  req,
  res
) {

  try {

    const especialistaUid =
      req.user?.uid;


    const pacienteUid =
      String(
        req.params.pacienteUid || ""
      ).trim();


    const acceso =
      await validarAccesoEspecialistaPaciente(

        especialistaUid,

        pacienteUid
      );


    if (
      !acceso.autorizado
    ) {

      return res
        .status(
          acceso.status
        )
        .json({

          success:
            false,

          code:
            acceso.code || null,

          message:
            acceso.message,
        });
    }


    const tipo =
      String(
        req.query.tipo || ""
      ).trim();


    let consulta =
      db
        .collection("usuarios")
        .doc(pacienteUid)
        .collection("resultados");


    if (
      tipo
    ) {

      consulta =
        consulta.where(
          "tipo",
          "==",
          tipo
        );
    }


    const snapshot =
      await consulta.get();


    const resultados =
      snapshot.docs

        .map(
          doc => ({

            id:
              doc.id,

            ...doc.data(),
          })
        )

        .sort(
          (
            a,
            b
          ) => {

            const aMs =
              a.fechaRegistro
                ?.toMillis?.() || 0;

            const bMs =
              b.fechaRegistro
                ?.toMillis?.() || 0;


            return bMs - aMs;
          }
        );


    return res.json({

      success:
        true,

      pacienteUid,

      tipo:
        tipo || null,

      resultados,
    });


  } catch (
    error
  ) {

    console.error(
      "Error en obtenerResultadosPaciente:",
      error
    );


    return res
      .status(500)
      .json({

        success:
          false,

        message:
          "No fue posible obtener los resultados del paciente.",

        error:
          error.message,
      });
  }
}


// ============================================================================
// CITAS COMPARTIDAS ENTRE ESPECIALISTA Y PACIENTE
// ============================================================================
//
// GET /api/especialista-pacientes/:pacienteUid/citas
//
// Solo devuelve citas en las que:
//
// - especialistaUid = usuario autenticado;
// - pacienteUid = paciente solicitado.
//
// Además exige relación ACTIVA.
//
// Esto evita mostrar citas que el paciente tenga con otros profesionales.
//
// ============================================================================

async function obtenerCitasPaciente(
  req,
  res
) {

  try {

    const especialistaUid =
      req.user?.uid;


    const pacienteUid =
      String(
        req.params.pacienteUid || ""
      ).trim();


    const acceso =
      await validarAccesoEspecialistaPaciente(

        especialistaUid,

        pacienteUid
      );


    if (
      !acceso.autorizado
    ) {

      return res
        .status(
          acceso.status
        )
        .json({

          success:
            false,

          code:
            acceso.code || null,

          message:
            acceso.message,
        });
    }


    // Consultamos primero las citas del especialista.
    //
    // Luego filtramos por paciente en el servidor para evitar depender
    // de un índice compuesto de Firestore únicamente para este endpoint.

    const snapshot =
      await db
        .collection("citas")
        .where(
          "especialistaUid",
          "==",
          especialistaUid
        )
        .get();


    const citas =
      snapshot.docs

        .map(
          doc => ({

            id:
              doc.id,

            ...doc.data(),
          })
        )

        .filter(
          cita =>
            cita.pacienteUid ===
            pacienteUid
        );


    return res.json({

      success:
        true,

      pacienteUid,

      citas,
    });


  } catch (
    error
  ) {

    console.error(
      "Error en obtenerCitasPaciente:",
      error
    );


    return res
      .status(500)
      .json({

        success:
          false,

        message:
          "No fue posible obtener las citas del paciente.",

        error:
          error.message,
      });
  }
}


// ============================================================================
// EXPORTAR
// ============================================================================

module.exports = {

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
};
