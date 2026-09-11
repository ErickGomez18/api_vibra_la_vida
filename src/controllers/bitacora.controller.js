// ============================================================================
// BITÁCORA CONTROLLER
// ============================================================================
//
// Maneja:
//
// 1. Mediciones individuales
// 2. Estudios de laboratorio
//
// Todo queda asociado al usuario autenticado:
//
// usuarios/{uid}/registrosSalud/{id}
//
// usuarios/{uid}/laboratorios/{id}
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
// OBTENER REGISTROS DE SALUD
// ============================================================================
//
// GET /api/bitacora/registros
//
// ============================================================================

async function getRegistrosSalud(req, res) {

  try {

    const uid =
      req.user.uid;


    const snapshot =
      await db
        .collection("usuarios")
        .doc(uid)
        .collection("registrosSalud")
        .orderBy(
          "creadoEn",
          "desc"
        )
        .get();


    const registros =
      snapshot.docs.map(
        (doc) => ({

          id:
            doc.id,

          ...doc.data(),

        })
      );


    return res.status(200).json({

      success: true,

      registros,

    });


  } catch (error) {


    console.error(
      "Error en getRegistrosSalud:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Error al obtener los registros de salud.",

      error:
        error.message,

    });
  }
}


// ============================================================================
// CREAR REGISTRO DE SALUD
// ============================================================================
//
// POST /api/bitacora/registros
//
// ============================================================================

async function createRegistroSalud(req, res) {

  try {

    const uid =
      req.user.uid;


    const {

      tipo,

      fecha,

      hora,

      valorPrincipal,

      valorSecundario,

      unidad,

      condicion,

      observaciones,

    } = req.body;


    // ========================================================================
    // VALIDACIÓN BÁSICA
    // ========================================================================

    if (
      !tipo ||
      !fecha ||
      !hora ||
      !valorPrincipal
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Faltan datos obligatorios.",

      });
    }


    const registroRef =
      db
        .collection("usuarios")
        .doc(uid)
        .collection("registrosSalud")
        .doc();


    const registro = {

      tipo,

      fecha,

      hora,

      valorPrincipal,

      valorSecundario:
        valorSecundario ?? "",

      unidad:
        unidad ?? "",

      condicion:
        condicion ?? "",

      observaciones:
        observaciones ?? "",

      creadoEn:
        FieldValue.serverTimestamp(),

      actualizadoEn:
        FieldValue.serverTimestamp(),

    };


    await registroRef.set(
      registro
    );


    return res.status(201).json({

      success: true,

      message:
        "Registro creado correctamente.",

      registro: {

        id:
          registroRef.id,

        ...registro,

      },

    });


  } catch (error) {


    console.error(
      "Error en createRegistroSalud:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Error al crear el registro.",

      error:
        error.message,

    });
  }
}


// ============================================================================
// ACTUALIZAR REGISTRO DE SALUD
// ============================================================================
//
// PUT /api/bitacora/registros/:id
//
// ============================================================================

async function updateRegistroSalud(req, res) {

  try {

    const uid =
      req.user.uid;

    const id =
      req.params.id;


    const registroRef =
      db
        .collection("usuarios")
        .doc(uid)
        .collection("registrosSalud")
        .doc(id);


    const registroDoc =
      await registroRef.get();


    if (!registroDoc.exists) {

      return res.status(404).json({

        success: false,

        message:
          "Registro no encontrado.",

      });
    }


    const {

      tipo,

      fecha,

      hora,

      valorPrincipal,

      valorSecundario,

      unidad,

      condicion,

      observaciones,

    } = req.body;


    const datosActualizados = {

      tipo,

      fecha,

      hora,

      valorPrincipal,

      valorSecundario:
        valorSecundario ?? "",

      unidad:
        unidad ?? "",

      condicion:
        condicion ?? "",

      observaciones:
        observaciones ?? "",

      actualizadoEn:
        FieldValue.serverTimestamp(),

    };


    await registroRef.update(
      datosActualizados
    );


    return res.status(200).json({

      success: true,

      message:
        "Registro actualizado correctamente.",

    });


  } catch (error) {


    console.error(
      "Error en updateRegistroSalud:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Error al actualizar el registro.",

      error:
        error.message,

    });
  }
}


// ============================================================================
// ELIMINAR REGISTRO DE SALUD
// ============================================================================
//
// DELETE /api/bitacora/registros/:id
//
// ============================================================================

async function deleteRegistroSalud(req, res) {

  try {

    const uid =
      req.user.uid;

    const id =
      req.params.id;


    const registroRef =
      db
        .collection("usuarios")
        .doc(uid)
        .collection("registrosSalud")
        .doc(id);


    const registroDoc =
      await registroRef.get();


    if (!registroDoc.exists) {

      return res.status(404).json({

        success: false,

        message:
          "Registro no encontrado.",

      });
    }


    await registroRef.delete();


    return res.status(200).json({

      success: true,

      message:
        "Registro eliminado correctamente.",

    });


  } catch (error) {


    console.error(
      "Error en deleteRegistroSalud:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Error al eliminar el registro.",

      error:
        error.message,

    });
  }
}


// ============================================================================
// OBTENER LABORATORIOS
// ============================================================================
//
// GET /api/bitacora/laboratorios
//
// ============================================================================

async function getLaboratorios(req, res) {

  try {

    const uid =
      req.user.uid;


    const snapshot =
      await db
        .collection("usuarios")
        .doc(uid)
        .collection("laboratorios")
        .orderBy(
          "creadoEn",
          "desc"
        )
        .get();


    const laboratorios =
      snapshot.docs.map(
        (doc) => ({

          id:
            doc.id,

          ...doc.data(),

        })
      );


    return res.status(200).json({

      success: true,

      laboratorios,

    });


  } catch (error) {


    console.error(
      "Error en getLaboratorios:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Error al obtener los laboratorios.",

      error:
        error.message,

    });
  }
}


// ============================================================================
// CREAR LABORATORIO
// ============================================================================
//
// POST /api/bitacora/laboratorios
//
// NOTA:
//
// Por ahora archivosUri se guarda tal como lo manda Android.
//
// Después lo cambiaremos por URLs de Firebase Storage.
//
// ============================================================================

async function createLaboratorio(req, res) {

  try {

    const uid =
      req.user.uid;


    const {

      tipoEstudio,

      nombrePersonalizado,

      fecha,

      laboratorio,

      archivosUri,

      observaciones,

    } = req.body;


    if (
      !tipoEstudio ||
      !fecha
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Faltan datos obligatorios.",

      });
    }


    const laboratorioRef =
      db
        .collection("usuarios")
        .doc(uid)
        .collection("laboratorios")
        .doc();


    const estudio = {

      tipoEstudio,

      nombrePersonalizado:
        nombrePersonalizado ?? "",

      fecha,

      laboratorio:
        laboratorio ?? "",

      archivosUri:
        Array.isArray(archivosUri)
          ? archivosUri
          : [],

      observaciones:
        observaciones ?? "",

      creadoEn:
        FieldValue.serverTimestamp(),

      actualizadoEn:
        FieldValue.serverTimestamp(),

    };


    await laboratorioRef.set(
      estudio
    );


    return res.status(201).json({

      success: true,

      message:
        "Estudio guardado correctamente.",

      estudio: {

        id:
          laboratorioRef.id,

        ...estudio,

      },

    });


  } catch (error) {


    console.error(
      "Error en createLaboratorio:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Error al guardar el estudio.",

      error:
        error.message,

    });
  }
}


// ============================================================================
// ACTUALIZAR LABORATORIO
// ============================================================================
//
// PUT /api/bitacora/laboratorios/:id
//
// ============================================================================

async function updateLaboratorio(req, res) {

  try {

    const uid =
      req.user.uid;

    const id =
      req.params.id;


    const laboratorioRef =
      db
        .collection("usuarios")
        .doc(uid)
        .collection("laboratorios")
        .doc(id);


    const laboratorioDoc =
      await laboratorioRef.get();


    if (!laboratorioDoc.exists) {

      return res.status(404).json({

        success: false,

        message:
          "Estudio no encontrado.",

      });
    }


    const {

      tipoEstudio,

      nombrePersonalizado,

      fecha,

      laboratorio,

      archivosUri,

      observaciones,

    } = req.body;


    const datosActualizados = {

      tipoEstudio,

      nombrePersonalizado:
        nombrePersonalizado ?? "",

      fecha,

      laboratorio:
        laboratorio ?? "",

      archivosUri:
        Array.isArray(archivosUri)
          ? archivosUri
          : [],

      observaciones:
        observaciones ?? "",

      actualizadoEn:
        FieldValue.serverTimestamp(),

    };


    await laboratorioRef.update(
      datosActualizados
    );


    return res.status(200).json({

      success: true,

      message:
        "Estudio actualizado correctamente.",

    });


  } catch (error) {


    console.error(
      "Error en updateLaboratorio:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Error al actualizar el estudio.",

      error:
        error.message,

    });
  }
}


// ============================================================================
// ELIMINAR LABORATORIO
// ============================================================================
//
// DELETE /api/bitacora/laboratorios/:id
//
// ============================================================================

async function deleteLaboratorio(req, res) {

  try {

    const uid =
      req.user.uid;

    const id =
      req.params.id;


    const laboratorioRef =
      db
        .collection("usuarios")
        .doc(uid)
        .collection("laboratorios")
        .doc(id);


    const laboratorioDoc =
      await laboratorioRef.get();


    if (!laboratorioDoc.exists) {

      return res.status(404).json({

        success: false,

        message:
          "Estudio no encontrado.",

      });
    }


    await laboratorioRef.delete();


    return res.status(200).json({

      success: true,

      message:
        "Estudio eliminado correctamente.",

    });


  } catch (error) {


    console.error(
      "Error en deleteLaboratorio:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Error al eliminar el estudio.",

      error:
        error.message,

    });
  }
}


// ============================================================================
// EXPORTACIONES
// ============================================================================

module.exports = {

  getRegistrosSalud,

  createRegistroSalud,

  updateRegistroSalud,

  deleteRegistroSalud,

  getLaboratorios,

  createLaboratorio,

  updateLaboratorio,

  deleteLaboratorio,

};