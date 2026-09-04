// Importamos Firebase Auth, Firestore y FieldValue desde nuestra configuración.
const { auth, db, FieldValue } = require("../config/firebase");

/**
 * Registrar usuario.
 *
 * Este endpoint:
 * 1. Recibe nombre, correo y contraseña.
 * 2. Crea el usuario en Firebase Authentication.
 * 3. Crea un documento del usuario en Firestore.
 */
async function register(req, res) {
  try {
    const { nombre, correo, password } = req.body;

    if (!nombre || !correo || !password) {
      return res.status(400).json({
        success: false,
        message: "Nombre, correo y contraseña son obligatorios.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "La contraseña debe tener al menos 6 caracteres.",
      });
    }

    // Creamos el usuario en Firebase Authentication.
    const userRecord = await auth.createUser({
      email: correo,
      password: password,
      displayName: nombre,
    });

    await db
      .collection("usuarios")
      .doc(userRecord.uid)
      .set({

        // ========================================================================
        // IDENTIFICACIÓN
        // ========================================================================

        uid:
          userRecord.uid,

        nombre:
          nombre,

        correo:
          correo,


        // ========================================================================
        // PERFIL INICIAL
        // ========================================================================

        edad:
          null,

        genero:
          null,

        peso:
          null,

        estatura:
          null,

        nivelActividad:
          null,


        // ========================================================================
        // ANTECEDENTES DECLARADOS
        // ========================================================================

        enfermedadesCronicas:
          [],

        otraEnfermedadCronica:
          "",


        // ========================================================================
        // PERFIL
        // ========================================================================

        fotoPerfilUrl:
          null,


        // ========================================================================
        // FECHAS
        // ========================================================================

        fechaRegistro:
          FieldValue.serverTimestamp(),

        actualizadoEn:
          FieldValue.serverTimestamp(),

      });

    return res.status(201).json({
      success: true,
      message: "Usuario registrado correctamente.",
      user: {
        uid: userRecord.uid,
        nombre: nombre,
        correo: correo,
      },
    });
  } catch (error) {
    console.error("Error en register:", error);

    if (error.code === "auth/email-already-exists") {
      return res.status(409).json({
        success: false,
        message: "Ya existe una cuenta registrada con ese correo.",
      });
    }

    if (error.code === "auth/invalid-email") {
      return res.status(400).json({
        success: false,
        message: "El correo electrónico no es válido.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Error al registrar usuario.",
      error: error.message,
    });
  }
}

/**
 * Iniciar sesión.
 *
 * Firebase Admin SDK no permite iniciar sesión directamente con correo y contraseña.
 * Por eso aquí usamos la API REST de Firebase Authentication.
 *
 * Este endpoint:
 * 1. Recibe correo y contraseña.
 * 2. Valida las credenciales con Firebase.
 * 3. Devuelve el idToken para usarlo en rutas protegidas.
 */
async function login(req, res) {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({
        success: false,
        message: "Correo y contraseña son obligatorios.",
      });
    }

    const apiKey = process.env.FIREBASE_WEB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "Falta FIREBASE_WEB_API_KEY en el archivo .env.",
      });
    }

    // URL de Firebase Auth para iniciar sesión con correo y contraseña.
    const firebaseLoginUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

    // Petición a Firebase Auth.
    const firebaseResponse = await fetch(firebaseLoginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: correo,
        password: password,
        returnSecureToken: true,
      }),
    });

    const data = await firebaseResponse.json();

    // Si Firebase responde error, mandamos mensaje claro.
    if (!firebaseResponse.ok) {
      let message = "Correo o contraseña incorrectos.";

      if (data.error?.message === "EMAIL_NOT_FOUND") {
        message = "No existe una cuenta con ese correo.";
      }

      if (data.error?.message === "INVALID_PASSWORD") {
        message = "La contraseña es incorrecta.";
      }

      if (data.error?.message === "INVALID_EMAIL") {
        message = "El correo electrónico no es válido.";
      }

      return res.status(401).json({
        success: false,
        message: message,
        firebaseError: data.error?.message || null,
      });
    }

    // Buscamos los datos del usuario en Firestore.
    const userDoc = await db.collection("usuarios").doc(data.localId).get();

    const userData = userDoc.exists ? userDoc.data() : null;

    return res.json({
      success: true,
      message: "Inicio de sesión correcto.",
      token: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
      user: {
        uid: data.localId,
        correo: data.email,
        nombre: userData?.nombre || data.displayName || null,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);

    return res.status(500).json({
      success: false,
      message: "Error al iniciar sesión.",
      error: error.message,
    });
  }
}

/**
 * Verificar sesión.
 *
 * Esta función se ejecuta después del middleware verifyFirebaseToken.
 */
async function verifySession(req, res) {
  return res.json({
    success: true,
    message: "Token verificado correctamente.",
    user: req.user,
  });
}

module.exports = {
  register,
  login,
  verifySession,
};