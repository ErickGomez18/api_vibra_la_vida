// ============================================================================
// HEALTH CONTROLLER - VIBRA LA VIDA
// ============================================================================
//
// INTEGRACIÓN SEGURA:
//
// Reloj / Health Connect
//          ↓
// App Android
//          ↓
// POST /api/health-connect/sync
//          ↓
// API Express en Render
//          ↓
// Firestore
//
// ESTRUCTURA:
//
// usuarios/{uid}/health_connect/{YYYY-MM-DD}
//
// Se utiliza UN documento por día.
//
// Así, si durante el mismo día Android vuelve a sincronizar,
// el documento se actualiza en lugar de crear cientos de registros.
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
// UTILIDADES
// ============================================================================

/**
 * Indica si una propiedad realmente llegó en el body.
 *
 * Esto es importante porque no queremos borrar datos anteriores
 * cuando Android realiza una actualización parcial.
 */
function tieneCampo(
  objeto,
  campo
) {

  return Object.prototype.hasOwnProperty.call(
    objeto,
    campo
  );
}


/**
 * Convierte a número.
 *
 * null / undefined / "" -> null
 *
 * Si recibe algo que no puede convertirse a número,
 * regresa null.
 */
function numeroONull(
  valor
) {

  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {

    return null;
  }


  const numero =
    Number(valor);


  if (
    !Number.isFinite(numero)
  ) {

    return null;
  }


  return numero;
}


/**
 * Obtiene la fecha que será utilizada como ID del documento.
 *
 * Formato esperado:
 *
 * YYYY-MM-DD
 *
 * Android ya envía esta fecha en HealthConnectSyncRequest.
 *
 * Si por compatibilidad con una versión anterior no llega la fecha,
 * utilizamos la fecha actual del servidor.
 */
function obtenerFechaDocumento(
  fecha
) {

  if (
    typeof fecha === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      fecha
    )
  ) {

    return fecha;
  }


  return new Date()
    .toISOString()
    .slice(
      0,
      10
    );
}


/**
 * Limpia un texto opcional.
 */
function textoONull(
  valor
) {

  if (
    valor === null ||
    valor === undefined
  ) {

    return null;
  }


  const texto =
    String(valor).trim();


  return texto || null;
}


// ============================================================================
// SINCRONIZAR HEALTH CONNECT
// ============================================================================
//
// POST /api/health-connect/sync
//
// Ejemplo:
//
// {
//   "fecha": "2026-09-18",
//   "pasos": 5320,
//   "frecuenciaCardiaca": 76,
//   "frecuenciaCardiacaMinima": 58,
//   "frecuenciaCardiacaMaxima": 121,
//   "cantidadMedicionesFrecuenciaCardiaca": 42,
//   "suenoMinutos": 438,
//   "inicioSueno": "2026-09-17T23:20:00Z",
//   "finSueno": "2026-09-18T06:38:00Z",
//   "suenoLigeroMinutos": 250,
//   "suenoProfundoMinutos": 120,
//   "suenoRemMinutos": 68,
//   "despiertoMinutos": 15,
//   "fuente": "Mi Fitness / Health Connect",
//   "fechaLectura": "2026-09-18T08:00:00Z"
// }
//
// ============================================================================

async function syncHealthData(
  req,
  res
) {

  try {

    // ========================================================================
    // 1. USUARIO AUTENTICADO
    // ========================================================================

    const uid =
      req.user?.uid;


    if (!uid) {

      return res
        .status(401)
        .json({

          success: false,

          message:
            "No se pudo identificar al usuario autenticado.",
        });
    }


    // ========================================================================
    // 2. BODY
    // ========================================================================

    const body =
      req.body || {};


    const fecha =
      obtenerFechaDocumento(
        body.fecha
      );


    // ========================================================================
    // 3. CAMPOS NUMÉRICOS SOPORTADOS
    // ========================================================================

    const camposNumericos = [

      "pasos",

      "frecuenciaCardiaca",

      "frecuenciaCardiacaMinima",

      "frecuenciaCardiacaMaxima",

      "cantidadMedicionesFrecuenciaCardiaca",

      "suenoMinutos",

      "suenoLigeroMinutos",

      "suenoProfundoMinutos",

      "suenoRemMinutos",

      "despiertoMinutos",
    ];


    // ========================================================================
    // 4. VALIDAR LOS NÚMEROS QUE SÍ LLEGARON
    // ========================================================================

    for (
      const campo of camposNumericos
    ) {

      if (
        !tieneCampo(
          body,
          campo
        )
      ) {

        continue;
      }


      const valorOriginal =
        body[campo];


      const valor =
        numeroONull(
          valorOriginal
        );


      // Si el cliente mandó un valor no vacío pero no es numérico.
      if (
        valorOriginal !== null &&
        valorOriginal !== undefined &&
        valorOriginal !== "" &&
        valor === null
      ) {

        return res
          .status(400)
          .json({

            success: false,

            message:
              `El campo ${campo} debe ser numérico.`,
          });
      }


      // Las métricas que manejamos aquí no pueden ser negativas.
      if (
        valor !== null &&
        valor < 0
      ) {

        return res
          .status(400)
          .json({

            success: false,

            message:
              `El campo ${campo} no puede ser negativo.`,
          });
      }
    }


    // ========================================================================
    // 5. DOCUMENTO DIARIO
    // ========================================================================

    const healthRef =
      db
        .collection("usuarios")
        .doc(uid)
        .collection("health_connect")
        .doc(fecha);


    const healthDoc =
      await healthRef.get();


    // ========================================================================
    // 6. DATOS BASE
    // ========================================================================
    //
    // Solamente agregamos al objeto los campos que Android realmente mandó.
    //
    // De esta manera:
    //
    // Primera sincronización:
    // pasos = 5000
    //
    // Segunda sincronización:
    // frecuenciaCardiaca = 75
    //
    // NO borra pasos.
    // ========================================================================

    const datos = {

      uid,

      fecha,

      fechaSincronizacion:
        FieldValue.serverTimestamp(),

      actualizadoEn:
        FieldValue.serverTimestamp(),
    };


    // ========================================================================
    // 7. AGREGAR CAMPOS NUMÉRICOS PRESENTES
    // ========================================================================

    for (
      const campo of camposNumericos
    ) {

      if (
        tieneCampo(
          body,
          campo
        )
      ) {

        datos[campo] =
          numeroONull(
            body[campo]
          );
      }
    }


    // ========================================================================
    // 8. SUEÑO - HORAS DE INICIO / FIN
    // ========================================================================

    if (
      tieneCampo(
        body,
        "inicioSueno"
      )
    ) {

      datos.inicioSueno =
        textoONull(
          body.inicioSueno
        );
    }


    if (
      tieneCampo(
        body,
        "finSueno"
      )
    ) {

      datos.finSueno =
        textoONull(
          body.finSueno
        );
    }


    // ========================================================================
    // 9. FUENTE
    // ========================================================================

    if (
      tieneCampo(
        body,
        "fuente"
      )
    ) {

      datos.fuente =
        textoONull(
          body.fuente
        ) ||
        "Health Connect";

    } else if (
      !healthDoc.exists
    ) {

      datos.fuente =
        "Health Connect";
    }


    // ========================================================================
    // 10. FECHA DE LECTURA
    // ========================================================================

    if (
      tieneCampo(
        body,
        "fechaLectura"
      )
    ) {

      datos.fechaLectura =
        textoONull(
          body.fechaLectura
        );
    }


    // ========================================================================
    // 11. FECHA DE CREACIÓN
    // ========================================================================

    if (
      !healthDoc.exists
    ) {

      datos.creadoEn =
        FieldValue.serverTimestamp();
    }


    // ========================================================================
    // 12. GUARDAR
    // ========================================================================

    await healthRef.set(
      datos,
      {
        merge: true,
      }
    );


    // ========================================================================
    // 13. RESPUESTA
    // ========================================================================

    return res
      .status(
        healthDoc.exists
          ? 200
          : 201
      )
      .json({

        success: true,

        message:
          healthDoc.exists
            ? "Datos de Health Connect actualizados correctamente."
            : "Datos de Health Connect guardados correctamente.",

        healthRecordId:
          fecha,

        fecha,
      });


  } catch (error) {

    console.error(
      "Error en syncHealthData:",
      error
    );


    return res
      .status(500)
      .json({

        success: false,

        message:
          "Error al guardar datos de Health Connect.",

        error:
          error.message,
      });
  }
}


// ============================================================================
// OBTENER ÚLTIMO REGISTRO
// ============================================================================
//
// GET /api/health-connect/latest
//
// ============================================================================

async function getLatestHealthData(
  req,
  res
) {

  try {

    const uid =
      req.user?.uid;


    if (!uid) {

      return res
        .status(401)
        .json({

          success: false,

          message:
            "No se pudo identificar al usuario autenticado.",
        });
    }


    const snapshot =
      await db
        .collection("usuarios")
        .doc(uid)
        .collection("health_connect")
        .orderBy(
          "fechaSincronizacion",
          "desc"
        )
        .limit(1)
        .get();


    if (
      snapshot.empty
    ) {

      return res.json({

        success: true,

        message:
          "No hay datos de Health Connect registrados.",

        data: null,
      });
    }


    const doc =
      snapshot.docs[0];


    return res.json({

      success: true,

      data: {

        id:
          doc.id,

        ...doc.data(),
      },
    });


  } catch (error) {

    console.error(
      "Error en getLatestHealthData:",
      error
    );


    return res
      .status(500)
      .json({

        success: false,

        message:
          "Error al obtener el último registro de Health Connect.",

        error:
          error.message,
      });
  }
}


// ============================================================================
// OBTENER HISTORIAL
// ============================================================================
//
// GET /api/health-connect/history
//
// Opcional:
//
// GET /api/health-connect/history?limit=30
//
// Máximo: 90
//
// ============================================================================

async function getHealthHistory(
  req,
  res
) {

  try {

    const uid =
      req.user?.uid;


    if (!uid) {

      return res
        .status(401)
        .json({

          success: false,

          message:
            "No se pudo identificar al usuario autenticado.",
        });
    }


    const requestedLimit =
      Number(
        req.query.limit
      );


    const limit =
      Number.isFinite(
        requestedLimit
      ) &&
      requestedLimit > 0

        ? Math.min(
            Math.trunc(
              requestedLimit
            ),
            90
          )

        : 30;


    const snapshot =
      await db
        .collection("usuarios")
        .doc(uid)
        .collection("health_connect")
        .orderBy(
          "fechaSincronizacion",
          "desc"
        )
        .limit(limit)
        .get();


    const history =
      snapshot.docs.map(
        (doc) => ({

          id:
            doc.id,

          ...doc.data(),
        })
      );


    return res.json({

      success: true,

      count:
        history.length,

      history,
    });


  } catch (error) {

    console.error(
      "Error en getHealthHistory:",
      error
    );


    return res
      .status(500)
      .json({

        success: false,

        message:
          "Error al obtener historial de Health Connect.",

        error:
          error.message,
      });
  }
}


// ============================================================================
// ELIMINAR UN REGISTRO
// ============================================================================
//
// DELETE /api/health-connect/:id
//
// El ID nuevo normalmente será:
//
// YYYY-MM-DD
//
// También continúa funcionando con IDs antiguos de Firestore.
//
// ============================================================================

async function deleteHealthRecord(
  req,
  res
) {

  try {

    const uid =
      req.user?.uid;


    const {
      id,
    } = req.params;


    if (!uid) {

      return res
        .status(401)
        .json({

          success: false,

          message:
            "No se pudo identificar al usuario autenticado.",
        });
    }


    if (
      !id
    ) {

      return res
        .status(400)
        .json({

          success: false,

          message:
            "No se indicó el registro de Health Connect.",
        });
    }


    const healthRef =
      db
        .collection("usuarios")
        .doc(uid)
        .collection("health_connect")
        .doc(id);


    const healthDoc =
      await healthRef.get();


    if (
      !healthDoc.exists
    ) {

      return res
        .status(404)
        .json({

          success: false,

          message:
            "Registro de Health Connect no encontrado.",
        });
    }


    await healthRef.delete();


    return res.json({

      success: true,

      message:
        "Registro de Health Connect eliminado correctamente.",
    });


  } catch (error) {

    console.error(
      "Error en deleteHealthRecord:",
      error
    );


    return res
      .status(500)
      .json({

        success: false,

        message:
          "Error al eliminar registro de Health Connect.",

        error:
          error.message,
      });
  }
}


// ============================================================================
// EXPORTACIONES
// ============================================================================

module.exports = {

  syncHealthData,

  getLatestHealthData,

  getHealthHistory,

  deleteHealthRecord,
};
