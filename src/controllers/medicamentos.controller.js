// ============================================================================
// MEDICAMENTOS CONTROLLER
// ============================================================================
//
// Maneja los medicamentos del usuario autenticado.
//
// Estructura Firestore:
//
// usuarios
//   └── {uid}
//       └── medicamentos
//           └── {medicamentoId}
//
// ============================================================================

const {
  db,
  FieldValue,
} = require("../config/firebase");


// ============================================================================
// OBTENER TODOS LOS MEDICAMENTOS
// ============================================================================
//
// GET /api/medicamentos
//
// ============================================================================

async function getMedicamentos(req, res) {

  try {

    // ========================================================================
    // UID DEL USUARIO AUTENTICADO
    // ========================================================================

    const uid =
      req.user.uid;


    // ========================================================================
    // CONSULTAR MEDICAMENTOS
    // ========================================================================

    const snapshot =
      await db
        .collection("usuarios")
        .doc(uid)
        .collection("medicamentos")
        .orderBy("creadoEn", "desc")
        .get();


    // ========================================================================
    // CONVERTIR DOCUMENTOS A JSON
    // ========================================================================

    const medicamentos =
      snapshot.docs.map(
        (doc) => ({

          id:
            doc.id,

          ...doc.data(),

        })
      );


    // ========================================================================
    // RESPUESTA
    // ========================================================================

    return res.json({

      success:
        true,

      medicamentos:
        medicamentos,

    });


  } catch (error) {


    console.error(
      "Error en getMedicamentos:",
      error
    );


    return res.status(500).json({

      success:
        false,

      message:
        "Error al obtener los medicamentos.",

      error:
        error.message,

    });
  }
}


// ============================================================================
// CREAR MEDICAMENTO
// ============================================================================
//
// POST /api/medicamentos
//
// ============================================================================

async function createMedicamento(req, res) {

  try {

    // ========================================================================
    // UID
    // ========================================================================

    const uid =
      req.user.uid;


    // ========================================================================
    // DATOS RECIBIDOS
    // ========================================================================

    const {

      nombre,

      dosis,

      presentacion,

      horarios,

      fechaInicio,

      fechaFin,

      indicaciones,

      recordatorioActivo,

      fotoUri,

    } = req.body;


    // ========================================================================
    // VALIDAR NOMBRE
    // ========================================================================

    if (
      !nombre ||
      nombre.trim() === ""
    ) {

      return res.status(400).json({

        success:
          false,

        message:
          "El nombre del medicamento es obligatorio.",

      });
    }


    // ========================================================================
    // VALIDAR HORARIOS
    // ========================================================================

    const horariosFinales =
      Array.isArray(horarios)
        ? horarios
        : [];


    // ========================================================================
    // REFERENCIA DEL NUEVO MEDICAMENTO
    // ========================================================================

    const medicamentoRef =
      db
        .collection("usuarios")
        .doc(uid)
        .collection("medicamentos")
        .doc();


    // ========================================================================
    // DATOS A GUARDAR
    // ========================================================================

    const medicamento = {

      nombre:
        nombre.trim(),

      dosis:
        dosis ?? "",

      presentacion:
        presentacion ?? "",

      horarios:
        horariosFinales,

      fechaInicio:
        fechaInicio ?? "",

      fechaFin:
        fechaFin ?? "",

      indicaciones:
        indicaciones ?? "",

      recordatorioActivo:
        typeof recordatorioActivo === "boolean"
          ? recordatorioActivo
          : true,

      fotoUri:
        fotoUri ?? null,

      creadoEn:
        FieldValue.serverTimestamp(),

      actualizadoEn:
        FieldValue.serverTimestamp(),

    };


    // ========================================================================
    // GUARDAR EN FIRESTORE
    // ========================================================================

    await medicamentoRef.set(
      medicamento
    );


    // ========================================================================
    // RESPUESTA
    // ========================================================================

    return res.status(201).json({

      success:
        true,

      message:
        "Medicamento creado correctamente.",

      medicamento: {

        id:
          medicamentoRef.id,

        ...medicamento,

      },
    });


  } catch (error) {


    console.error(
      "Error en createMedicamento:",
      error
    );


    return res.status(500).json({

      success:
        false,

      message:
        "Error al crear el medicamento.",

      error:
        error.message,

    });
  }
}


// ============================================================================
// ACTUALIZAR MEDICAMENTO
// ============================================================================
//
// PUT /api/medicamentos/:id
//
// ============================================================================

async function updateMedicamento(req, res) {

  try {

    // ========================================================================
    // UID
    // ========================================================================

    const uid =
      req.user.uid;


    // ========================================================================
    // ID DEL MEDICAMENTO
    // ========================================================================

    const medicamentoId =
      req.params.id;


    // ========================================================================
    // DATOS RECIBIDOS
    // ========================================================================

    const {

      nombre,

      dosis,

      presentacion,

      horarios,

      fechaInicio,

      fechaFin,

      indicaciones,

      recordatorioActivo,

      fotoUri,

    } = req.body;


    // ========================================================================
    // REFERENCIA
    // ========================================================================

    const medicamentoRef =
      db
        .collection("usuarios")
        .doc(uid)
        .collection("medicamentos")
        .doc(medicamentoId);


    // ========================================================================
    // COMPROBAR EXISTENCIA
    // ========================================================================

    const medicamentoDoc =
      await medicamentoRef.get();


    if (!medicamentoDoc.exists) {

      return res.status(404).json({

        success:
          false,

        message:
          "Medicamento no encontrado.",

      });
    }


    // ========================================================================
    // DATOS ACTUALES
    // ========================================================================

    const medicamentoActual =
      medicamentoDoc.data();


    // ========================================================================
    // DATOS ACTUALIZADOS
    // ========================================================================

    const datosActualizados = {

      nombre:
        nombre !== undefined
          ? String(nombre).trim()
          : medicamentoActual.nombre,

      dosis:
        dosis !== undefined
          ? dosis
          : medicamentoActual.dosis,

      presentacion:
        presentacion !== undefined
          ? presentacion
          : medicamentoActual.presentacion,

      horarios:
        Array.isArray(horarios)
          ? horarios
          : medicamentoActual.horarios,

      fechaInicio:
        fechaInicio !== undefined
          ? fechaInicio
          : medicamentoActual.fechaInicio,

      fechaFin:
        fechaFin !== undefined
          ? fechaFin
          : medicamentoActual.fechaFin,

      indicaciones:
        indicaciones !== undefined
          ? indicaciones
          : medicamentoActual.indicaciones,

      recordatorioActivo:
        typeof recordatorioActivo === "boolean"
          ? recordatorioActivo
          : medicamentoActual.recordatorioActivo,

      fotoUri:
        fotoUri !== undefined
          ? fotoUri
          : medicamentoActual.fotoUri,

      actualizadoEn:
        FieldValue.serverTimestamp(),

    };


    // ========================================================================
    // VALIDAR NOMBRE SI FUE ENVIADO
    // ========================================================================

    if (
      datosActualizados.nombre === ""
    ) {

      return res.status(400).json({

        success:
          false,

        message:
          "El nombre del medicamento no puede estar vacío.",

      });
    }


    // ========================================================================
    // ACTUALIZAR
    // ========================================================================

    await medicamentoRef.update(
      datosActualizados
    );


    // ========================================================================
    // RESPUESTA
    // ========================================================================

    return res.json({

      success:
        true,

      message:
        "Medicamento actualizado correctamente.",

    });


  } catch (error) {


    console.error(
      "Error en updateMedicamento:",
      error
    );


    return res.status(500).json({

      success:
        false,

      message:
        "Error al actualizar el medicamento.",

      error:
        error.message,

    });
  }
}


// ============================================================================
// ELIMINAR MEDICAMENTO
// ============================================================================
//
// DELETE /api/medicamentos/:id
//
// ============================================================================

async function deleteMedicamento(req, res) {

  try {

    // ========================================================================
    // UID
    // ========================================================================

    const uid =
      req.user.uid;


    // ========================================================================
    // ID
    // ========================================================================

    const medicamentoId =
      req.params.id;


    // ========================================================================
    // REFERENCIA
    // ========================================================================

    const medicamentoRef =
      db
        .collection("usuarios")
        .doc(uid)
        .collection("medicamentos")
        .doc(medicamentoId);


    // ========================================================================
    // COMPROBAR EXISTENCIA
    // ========================================================================

    const medicamentoDoc =
      await medicamentoRef.get();


    if (!medicamentoDoc.exists) {

      return res.status(404).json({

        success:
          false,

        message:
          "Medicamento no encontrado.",

      });
    }


    // ========================================================================
    // ELIMINAR
    // ========================================================================

    await medicamentoRef.delete();


    // ========================================================================
    // RESPUESTA
    // ========================================================================

    return res.json({

      success:
        true,

      message:
        "Medicamento eliminado correctamente.",

    });


  } catch (error) {


    console.error(
      "Error en deleteMedicamento:",
      error
    );


    return res.status(500).json({

      success:
        false,

      message:
        "Error al eliminar el medicamento.",

      error:
        error.message,

    });
  }
}


// ============================================================================
// EXPORTACIONES
// ============================================================================

module.exports = {

  getMedicamentos,

  createMedicamento,

  updateMedicamento,

  deleteMedicamento,

};