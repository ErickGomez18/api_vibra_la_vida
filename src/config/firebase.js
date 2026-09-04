// Importamos las funciones principales de Firebase Admin.
// Esta forma funciona correctamente con versiones actuales de firebase-admin.
const { initializeApp, cert, getApps } = require("firebase-admin/app");

// Importamos Firestore y FieldValue para manejar fechas del servidor.
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// Importamos Firebase Authentication.
const { getAuth } = require("firebase-admin/auth");

// Importamos la llave privada del proyecto Firebase.
// Este archivo debe estar en la raíz del proyecto: api-vibra-la-vida/serviceAccountKey.json
const serviceAccount = require("../../serviceAccountKey.json");

/**
 * Inicializamos Firebase Admin.
 *
 * getApps() evita que Firebase se inicialice más de una vez
 * cuando nodemon reinicia el servidor durante el desarrollo.
 */
const firebaseApp =
  getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount),
      })
    : getApps()[0];

// Creamos referencia a Cloud Firestore.
const db = getFirestore(firebaseApp);

// Creamos referencia a Firebase Authentication.
const auth = getAuth(firebaseApp);

// Exportamos las herramientas para usarlas en controladores y middlewares.
module.exports = {
  db,
  auth,
  FieldValue,
};