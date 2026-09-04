// Importamos Firestore y FieldValue.
const { db, FieldValue } = require("../config/firebase");

/**
 * Guardar sincronización de Health Connect.
 *
 * Aquí la app Android mandará:
 * - pasos
 * - frecuencia cardíaca
 * - sueño en minutos
 * - fuente del dato
 */
async function syncHealthData(req, res) {
  try {
    const uid = req.user.uid;

    const {
      pasos,
      frecuenciaCardiaca,
      suenoMinutos,
      fuente,
      fechaLectura,
    } = req.body;

    const healthRef = await db
      .collection("usuarios")
      .doc(uid)
      .collection("health_connect")
      .add({
        pasos: pasos ?? null,
        frecuenciaCardiaca: frecuenciaCardiaca ?? null,
        suenoMinutos: suenoMinutos ?? null,
        fuente: fuente ?? "Health Connect",
        fechaLectura: fechaLectura ?? null,
        fechaSincronizacion: FieldValue.serverTimestamp(),
      });

    return res.status(201).json({
      success: true,
      message: "Datos de Health Connect guardados correctamente.",
      healthRecordId: healthRef.id,
    });
  } catch (error) {
    console.error("Error en syncHealthData:", error);

    return res.status(500).json({
      success: false,
      message: "Error al guardar datos de Health Connect.",
      error: error.message,
    });
  }
}

/**
 * Obtener el último registro de Health Connect.
 */
async function getLatestHealthData(req, res) {
  try {
    const uid = req.user.uid;

    const snapshot = await db
      .collection("usuarios")
      .doc(uid)
      .collection("health_connect")
      .orderBy("fechaSincronizacion", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.json({
        success: true,
        message: "No hay datos de Health Connect registrados.",
        data: null,
      });
    }

    const doc = snapshot.docs[0];

    return res.json({
      success: true,
      data: {
        id: doc.id,
        ...doc.data(),
      },
    });
  } catch (error) {
    console.error("Error en getLatestHealthData:", error);

    return res.status(500).json({
      success: false,
      message: "Error al obtener el último registro de Health Connect.",
      error: error.message,
    });
  }
}

/**
 * Obtener historial completo de Health Connect.
 */
async function getHealthHistory(req, res) {
  try {
    const uid = req.user.uid;

    const snapshot = await db
      .collection("usuarios")
      .doc(uid)
      .collection("health_connect")
      .orderBy("fechaSincronizacion", "desc")
      .get();

    const history = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error("Error en getHealthHistory:", error);

    return res.status(500).json({
      success: false,
      message: "Error al obtener historial de Health Connect.",
      error: error.message,
    });
  }
}

/**
 * Eliminar un registro de Health Connect.
 */
async function deleteHealthRecord(req, res) {
  try {
    const uid = req.user.uid;
    const { id } = req.params;

    const healthRef = db
      .collection("usuarios")
      .doc(uid)
      .collection("health_connect")
      .doc(id);

    const healthDoc = await healthRef.get();

    if (!healthDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Registro de Health Connect no encontrado.",
      });
    }

    await healthRef.delete();

    return res.json({
      success: true,
      message: "Registro de Health Connect eliminado correctamente.",
    });
  } catch (error) {
    console.error("Error en deleteHealthRecord:", error);

    return res.status(500).json({
      success: false,
      message: "Error al eliminar registro de Health Connect.",
      error: error.message,
    });
  }
}

module.exports = {
  syncHealthData,
  getLatestHealthData,
  getHealthHistory,
  deleteHealthRecord,
};