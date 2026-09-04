// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

const {
  auth,
} = require("../config/firebase");


// ============================================================================
// VERIFICAR TOKEN DE FIREBASE
// ============================================================================

async function verifyFirebaseToken(req, res, next) {

  try {

    // ========================================================================
    // LEER HEADER AUTHORIZATION
    // ========================================================================

    const authorization =
      req.headers.authorization;


    // ========================================================================
    // VALIDAR HEADER
    // ========================================================================

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {

      return res.status(401).json({

        success: false,

        message:
          "Token no proporcionado.",

      });
    }


    // ========================================================================
    // EXTRAER TOKEN
    // ========================================================================

    const token =
      authorization.split("Bearer ")[1];


    // ========================================================================
    // VERIFICAR TOKEN CON FIREBASE
    // ========================================================================

    const decodedToken =
      await auth.verifyIdToken(
        token
      );


    // ========================================================================
    // GUARDAR TODOS LOS DATOS DEL TOKEN
    // ========================================================================
    //
    // Antes posiblemente estábamos guardando únicamente:
    //
    // req.user = { uid: decodedToken.uid }
    //
    // Ahora conservamos:
    //
    // uid
    // email
    // name
    // email_verified
    // etc.
    //
    // ========================================================================

    req.user =
      decodedToken;


    // ========================================================================
    // CONTINUAR
    // ========================================================================

    next();


  } catch (error) {

    console.error(
      "Error verificando token:",
      error
    );


    return res.status(401).json({

      success: false,

      message:
        "Token inválido o expirado.",

    });
  }
}


// ============================================================================
// EXPORTACIONES
// ============================================================================

module.exports = {

  verifyFirebaseToken,

};