// Importamos Firestore y FieldValue desde Firebase.
const { db, FieldValue } = require("../config/firebase");

/**
 * Guardar resultado general.
 *
 * Este endpoint sirve para guardar:
 * - DASS-21: depresión, ansiedad, estrés
 * - AIS: sueño / insomnio
 * - IMC
 * - Calorías
 * - Riesgo cardiovascular
 */
async function saveResult(req, res) {
  try {
    const uid = req.user.uid;

    const {
      tipo,
      categoria,
      puntaje,
      clasificacion,
      descripcion,
      respuestas,
      datosExtra,
    } = req.body;

    if (!tipo) {
      return res.status(400).json({
        success: false,
        message: "El tipo de resultado es obligatorio.",
      });
    }

    const resultRef = await db
      .collection("usuarios")
      .doc(uid)
      .collection("resultados")
      .add({
        tipo: tipo,
        categoria: categoria ?? null,
        puntaje: puntaje ?? null,
        clasificacion: clasificacion ?? null,
        descripcion: descripcion ?? null,
        respuestas: respuestas ?? null,
        datosExtra: datosExtra ?? null,
        fechaRegistro: FieldValue.serverTimestamp(),
      });

    return res.status(201).json({
      success: true,
      message: "Resultado guardado correctamente.",
      resultId: resultRef.id,
    });
  } catch (error) {
    console.error("Error en saveResult:", error);

    return res.status(500).json({
      success: false,
      message: "Error al guardar el resultado.",
      error: error.message,
    });
  }
}

/**
 * Obtener todos los resultados del usuario autenticado.
 */
async function getMyResults(req, res) {
  try {
    const uid = req.user.uid;

    const snapshot = await db
      .collection("usuarios")
      .doc(uid)
      .collection("resultados")
      .orderBy("fechaRegistro", "desc")
      .get();

    const results = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Error en getMyResults:", error);

    return res.status(500).json({
      success: false,
      message: "Error al obtener resultados.",
      error: error.message,
    });
  }
}

/**
 * Obtener resultados filtrados por tipo.
 *
 * Ejemplo:
 * GET /api/results/type/dass_depresion
 * GET /api/results/type/ais
 * GET /api/results/type/imc
 */
async function getResultsByType(req, res) {
  try {
    const uid = req.user.uid;
    const { tipo } = req.params;

    const snapshot = await db
      .collection("usuarios")
      .doc(uid)
      .collection("resultados")
      .where("tipo", "==", tipo)
      .orderBy("fechaRegistro", "desc")
      .get();

    const results = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({
      success: true,
      tipo,
      results,
    });
  } catch (error) {
    console.error("Error en getResultsByType:", error);

    return res.status(500).json({
      success: false,
      message: "Error al obtener resultados por tipo.",
      error: error.message,
    });
  }
}

/**
 * Eliminar un resultado específico.
 */
async function deleteResult(req, res) {
  try {
    const uid = req.user.uid;
    const { id } = req.params;

    const resultRef = db
      .collection("usuarios")
      .doc(uid)
      .collection("resultados")
      .doc(id);

    const resultDoc = await resultRef.get();

    if (!resultDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Resultado no encontrado.",
      });
    }

    await resultRef.delete();

    return res.json({
      success: true,
      message: "Resultado eliminado correctamente.",
    });
  } catch (error) {
    console.error("Error en deleteResult:", error);

    return res.status(500).json({
      success: false,
      message: "Error al eliminar el resultado.",
      error: error.message,
    });
  }
}

module.exports = {
  saveResult,
  getMyResults,
  getResultsByType,
  deleteResult,
};