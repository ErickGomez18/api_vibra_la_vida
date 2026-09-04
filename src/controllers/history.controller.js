// Importamos Firestore.
const { db } = require("../config/firebase");

/**
 * Obtener historial general del usuario.
 *
 * Une en una sola respuesta:
 * - perfil del usuario
 * - resultados
 * - registros de Health Connect
 */
async function getGeneralHistory(req, res) {
  try {
    const uid = req.user.uid;

    // Obtenemos el documento principal del usuario.
    const userDoc = await db.collection("usuarios").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado.",
      });
    }

    // Obtenemos resultados.
    const resultsSnapshot = await db
      .collection("usuarios")
      .doc(uid)
      .collection("resultados")
      .orderBy("fechaRegistro", "desc")
      .get();

    const results = resultsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Obtenemos historial de Health Connect.
    const healthSnapshot = await db
      .collection("usuarios")
      .doc(uid)
      .collection("health_connect")
      .orderBy("fechaSincronizacion", "desc")
      .get();

    const healthConnect = healthSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({
      success: true,
      user: userDoc.data(),
      results,
      healthConnect,
    });
  } catch (error) {
    console.error("Error en getGeneralHistory:", error);

    return res.status(500).json({
      success: false,
      message: "Error al obtener historial general.",
      error: error.message,
    });
  }
}

module.exports = {
  getGeneralHistory,
};