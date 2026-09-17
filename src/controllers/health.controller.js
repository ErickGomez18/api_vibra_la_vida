// ============================================================================
// HEALTH CONTROLLER
// ============================================================================
//
// Maneja la sincronización de datos provenientes de Health Connect.
//
// ESTRUCTURA EN FIRESTORE:
//
// usuarios/{uid}/health_connect/{YYYY-MM-DD}
//
// Utilizamos un documento por día para evitar crear un registro nuevo
// cada vez que la app actualiza los datos.
//
// Esto permite que:
//
// - los pasos del día se actualicen;
// - la frecuencia cardíaca se actualice;
// - el resumen de sueño se actualice;
// - no se creen cientos de documentos por usuario.
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
 * Convierte un valor a número cuando sea posible.
 *
 * Si el valor no existe o no es válido,
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
    !Number.isFinite(
      numero
    )
  ) {

    return null;
  }


  return numero;
}


/**
 * Limpia una fecha con formato:
 *
 * YYYY-MM-DD
 *
 * Si no es válida,
 * utiliza la fecha actual del servidor.
 *
 * IMPORTANTE:
 *
 * Lo ideal es que Android envíe la fecha local del usuario
 * para evitar diferencias por zona horaria.
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


// ============================================================================
// SINCRONIZAR HEALTH CONNECT
// ============================================================================
//
// POST /api/health-connect/sync
//
// La app Android puede enviar:
//
// {
//   "fecha": "2026-09-17",
//   "pasos": 5320,
//
//   "frecuenciaCardiaca": 76,
//   "frecuenciaCardiacaMinima": 58,
//   "frecuenciaCardiacaMaxima": 121,
//   "cantidadMedicionesFrecuenciaCardiaca": 42,
//
//   "suenoMinutos": 438,
//   "inicioSueno": "2026-09-16T23:20:00Z",
//   "finSueno": "2026-09-17T06:38:00Z",
//   "suenoLigeroMinutos": 250,
//   "suenoProfundoMinutos": 120,
//   "suenoRemMinutos": 68,
//   "despiertoMinutos": 15,
//
//   "fuente": "Mi Fitness / Health Connect"
// }
//
// ============================================================================

async function syncHealthData(
  req,
  res
) {

  try {

    // ========================================================================
    // USUARIO
    // ========================================================================

    const uid =
      req.user?.uid;


    if (
      !uid
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


    // ========================================================================
    // BODY
    // ========================================================================

    const body =
      req.body || {};


    const fecha =
      obtenerFechaDocumento(
        body.fecha
      );


    // ========================================================================
    // NORMALIZAR DATOS
    // ========================================================================

    const pasos =
      numeroONull(
        body.pasos
      );


    const frecuenciaCardiaca =
      numeroONull(
        body.frecuenciaCardiaca
      );


    const frecuenciaCardiacaMinima =
      numeroONull(
        body.frecuenciaCardiacaMinima
      );


    const frecuenciaCardiacaMaxima =
      numeroONull(
        body.frecuenciaCardiacaMaxima
      );


    const cantidadMedicionesFrecuenciaCardiaca =
      numeroONull(
        body.cantidadMedicionesFrecuenciaCardiaca
      );


    const suenoMinutos =
      numeroONull(
        body.suenoMinutos
      );


    const suenoLigeroMinutos =
      numeroONull(
        body.suenoLigeroMinutos
      );


    const suenoProfundoMinutos =
      numeroONull(
        body.suenoProfundoMinutos
      );


    const suenoRemMinutos =
      numeroONull(
        body.suenoRemMinutos
      );


    const despiertoMinutos =
      numeroONull(
        body.despiertoMinutos
      );


    // ========================================================================
    // VALIDACIONES BÁSICAS
    // ========================================================================

    const valoresNoNegativos = [

      pasos,

      frecuenciaCardiaca,

      frecuenciaCardiacaMinima,

      frecuenciaCardiacaMaxima,

      cantidadMedicionesFrecuenciaCardiaca,

      suenoMinutos,

      suenoLigeroMinutos,

      suenoProfundoMinutos,

      suenoRemMinutos,

      despiertoMinutos,
    ];


    const existeValorNegativo =
      valoresNoNegativos.some(
        (valor) =>
          valor !== null &&
          valor < 0
      );


    if (
      existeValorNegativo
    ) {

      return res
        .status(400)
        .json({

          success:
            false,

          message:
            "Los valores de salud no pueden ser negativos.",
        });
    }


    // ========================================================================
    // FUENTE
    // ========================================================================

    const fuente =
      typeof body.fuente === "string" &&
      body.fuente.trim()
        ? body.fuente.trim()
        : "Health Connect";


    // ========================================================================
    // DOCUMENTO DIARIO
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
    // DATOS A GUARDAR
    // ========================================================================

    const datos = {

      uid,

      fecha,


      // ----------------------------------------------------------------------
      // ACTIVIDAD FÍSICA
      // ----------------------------------------------------------------------

      pasos,


      // ----------------------------------------------------------------------
      // FRECUENCIA CARDÍACA
      // ----------------------------------------------------------------------

      frecuenciaCardiaca,

      frecuenciaCardiacaMinima,

      frecuenciaCardiacaMaxima,

      cantidadMedicionesFrecuenciaCardiaca,


      // ----------------------------------------------------------------------
      // SUEÑO
      // ----------------------------------------------------------------------

      suenoMinutos,

      inicioSueno:
        body.inicioSueno ?? null,

      finSueno:
        body.finSueno ?? null,

      suenoLigeroMinutos,

      suenoProfundoMinutos,

      suenoRemMinutos,

      despiertoMinutos,


      // ----------------------------------------------------------------------
      // ORIGEN
      // ----------------------------------------------------------------------

      fuente,


      // ----------------------------------------------------------------------
      // FECHAS DE CONTROL
      // ----------------------------------------------------------------------

      fechaLectura:
        body.fechaLectura ?? null,

      fechaSincronizacion:
        FieldValue.serverTimestamp(),

      actualizadoEn:
        FieldValue.serverTimestamp(),
    };


    // Fecha de creación únicamente la primera vez.
    if (
      !healthDoc.exists
    ) {

      datos.creadoEn =
        FieldValue.serverTimestamp();
    }


    // ========================================================================
    // GUARDAR / ACTUALIZAR
    // ========================================================================

    await healthRef.set(

      datos,

      {
        merge:
          true,
      }
    );


    // ========================================================================
    // RESPUESTA
    // ========================================================================

    return res
      .status(
        healthDoc.exists
          ? 200
          : 201
      )
      .json({

        success:
          true,

        message:
          healthDoc.exists
            ? "Datos de Health Connect actualizados correctamente."
            : "Datos de Health Connect guardados correctamente.",

        healthRecordId:
          fecha,

        fecha,
      });


  } catch (
    error
  ) {

    console.error(
      "Error en syncHealthData:",
      error
    );


    return res
      .status(500)
      .json({

        success:
          false,

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


    if (
      !uid
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

        success:
          true,

        message:
          "No hay datos de Health Connect registrados.",

        data:
          null,
      });
    }


    const doc =
      snapshot.docs[0];


    return res.json({

      success:
        true,

      data: {

        id:
          doc.id,

        ...doc.data(),
      },
    });


  } catch (
    error
  ) {

    console.error(
      "Error en getLatestHealthData:",
      error
    );


    return res
      .status(500)
      .json({

        success:
          false,

        message:
          "Error al obtener el último registro de Health Connect.",

        error:
          error.message,
      });
  }
}


// ============================================================================
// HISTORIAL
// ============================================================================
//
// GET /api/health-connect/history
//
// Opcional:
//
// GET /api/health-connect/history?limit=30
//
// Máximo:
// 90 registros.
//
// ============================================================================

async function getHealthHistory(
  req,
  res
) {

  try {

    const uid =
      req.user?.uid;


    if (
      !uid
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

      success:
        true,

      count:
        history.length,

      history,
    });


  } catch (
    error
  ) {

    console.error(
      "Error en getHealthHistory:",
      error
    );


    return res
      .status(500)
      .json({

        success:
          false,

        message:
          "Error al obtener historial de Health Connect.",

        error:
          error.message,
      });
  }
}


// ============================================================================
// ELIMINAR REGISTRO
// ============================================================================
//
// DELETE /api/health-connect/:id
//
// El id normalmente será:
//
// YYYY-MM-DD
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


    if (
      !uid
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

          success:
            false,

          message:
            "Registro de Health Connect no encontrado.",
        });
    }


    await healthRef.delete();


    return res.json({

      success:
        true,

      message:
        "Registro de Health Connect eliminado correctamente.",
    });


  } catch (
    error
  ) {

    console.error(
      "Error en deleteHealthRecord:",
      error
    );


    return res
      .status(500)
      .json({

        success:
          false,

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
