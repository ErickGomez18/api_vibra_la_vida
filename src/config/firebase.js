// ============================================================================
// FIREBASE ADMIN - CONFIGURACIÓN
// ============================================================================
//
// Esta configuración funciona en dos ambientes:
//
// 1. DESARROLLO LOCAL
//    Utiliza serviceAccountKey.json
//
// 2. RENDER / PRODUCCIÓN
//    Utiliza variables de entorno.
//
// De esta manera NO necesitamos subir la llave privada a GitHub.
//
// ============================================================================


// Importamos las funciones principales de Firebase Admin.
const {
  initializeApp,
  cert,
  getApps,
} = require("firebase-admin/app");


// Importamos Firestore y FieldValue.
const {
  getFirestore,
  FieldValue,
} = require("firebase-admin/firestore");


// Importamos Firebase Authentication.
const {
  getAuth,
} = require("firebase-admin/auth");


// ============================================================================
// CREDENCIALES
// ============================================================================

let serviceAccount;


// Si existen las variables de entorno,
// significa que probablemente estamos ejecutando la API en Render.
if (
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
) {

  console.log("Firebase Admin: usando variables de entorno.");

  serviceAccount = {

    projectId:
      process.env.FIREBASE_PROJECT_ID,

    clientEmail:
      process.env.FIREBASE_CLIENT_EMAIL,

    // Render guarda los saltos de línea como \n.
    // Aquí los convertimos nuevamente en saltos reales.
    privateKey:
      process.env.FIREBASE_PRIVATE_KEY.replace(
        /\\n/g,
        "\n"
      ),
  };

} else {

  // ========================================================================
  // DESARROLLO LOCAL
  // ========================================================================
  //
  // Si no existen variables de entorno,
  // utilizamos serviceAccountKey.json.
  //
  // Este archivo NO debe subirse a GitHub.
  //
  // ========================================================================

  console.log(
    "Firebase Admin: usando serviceAccountKey.json local."
  );

  serviceAccount =
    require("../../serviceAccountKey.json");
}


// ============================================================================
// INICIALIZAR FIREBASE ADMIN
// ============================================================================
//
// getApps() evita inicializar Firebase más de una vez.
//
// Esto también evita problemas cuando nodemon reinicia la API.
//
// ============================================================================

const firebaseApp =
  getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount),
      })
    : getApps()[0];


// ============================================================================
// FIRESTORE
// ============================================================================

const db =
  getFirestore(firebaseApp);


// ============================================================================
// FIREBASE AUTHENTICATION
// ============================================================================

const auth =
  getAuth(firebaseApp);


// ============================================================================
// EXPORTACIONES
// ============================================================================

module.exports = {

  db,

  auth,

  FieldValue,
};