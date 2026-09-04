// ============================================================================
// USER CONTROLLER
// ============================================================================
//
// Este controlador maneja la información del perfil
// del usuario autenticado.
//
// El UID NO viene del body.
//
// El UID se obtiene del token de Firebase mediante
// auth.middleware.js.
//
// ============================================================================


// Importamos Firestore y FieldValue.
const {
  db,
  FieldValue,
} = require("../config/firebase");


// ============================================================================
// OBTENER MI PERFIL
// ============================================================================
//
// GET /api/users/me
//
// Requiere:
//
// Authorization: Bearer TOKEN
//
// ============================================================================

async function getMyProfile(req, res) {

  try {


    // ========================================================================
    // UID DEL USUARIO AUTENTICADO
    // ========================================================================

    const uid =
      req.user.uid;


    // ========================================================================
    // BUSCAR USUARIO
    // ========================================================================

    const userDoc =
      await db
        .collection("usuarios")
        .doc(uid)
        .get();


    // ========================================================================
    // PERFIL NO ENCONTRADO
    // ========================================================================

    if (!userDoc.exists) {

      return res.status(404).json({

        success: false,

        message:
          "Perfil no encontrado.",

      });
    }


    // ========================================================================
    // PERFIL ENCONTRADO
    // ========================================================================

    return res.json({

      success: true,

      user: userDoc.data(),

    });


  } catch (error) {


    console.error(
      "Error en getMyProfile:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Error al obtener el perfil.",

      error:
        error.message,

    });
  }
}


// ============================================================================
// ACTUALIZAR O CREAR MI PERFIL
// ============================================================================
//
// PUT /api/users/me
//
// Si el documento ya existe:
//
// → actualiza solamente los campos enviados.
//
// Si el documento NO existe:
//
// → lo crea.
//
// Esto es importante porque Android crea primero
// al usuario dentro de Firebase Authentication,
// pero eso NO crea automáticamente un documento
// dentro de Firestore.
//
// ============================================================================
//
// Body esperado:
//
// {
//   "edad": "19",
//   "genero": "Mujer",
//   "peso": "62",
//   "estatura": "1.65",
//   "nivelActividad": "Moderado",
//   "enfermedadesCronicas": [
//       "Diabetes mellitus",
//       "Hipertensión arterial"
//   ],
//   "otraEnfermedadCronica": ""
// }
//
// ============================================================================

// ============================================================================
// ACTUALIZAR O CREAR MI PERFIL
// ============================================================================
//
// PUT /api/users/me
//
// El documento de Firestore SIEMPRE tendrá como ID
// el mismo UID de Firebase Authentication.
//
// ============================================================================

async function updateMyProfile(req, res) {

  try {


    // ========================================================================
    // USUARIO OBTENIDO DEL TOKEN
    // ========================================================================

    const uid = req.user?.uid;

    const correo = req.user?.email ?? null;


    // ========================================================================
    // VALIDAR UID
    // ========================================================================
    //
    // No permitimos crear documentos si el token
    // no contiene un UID válido.
    //
    // ========================================================================

    if (!uid) {

      return res.status(401).json({

        success: false,

        message:
          "No se pudo identificar al usuario autenticado.",

      });
    }


    // ========================================================================
    // DATOS RECIBIDOS DESDE ANDROID
    // ========================================================================

    const {

      edad,

      genero,

      peso,

      estatura,

      nivelActividad,

      enfermedadesCronicas,

      otraEnfermedadCronica,

    } = req.body;


    // ========================================================================
    // VALIDAR ENFERMEDADES CRÓNICAS
    // ========================================================================

    const enfermedadesFinales =
      Array.isArray(enfermedadesCronicas)
        ? enfermedadesCronicas
        : [];


    // ========================================================================
    // REFERENCIA DEL DOCUMENTO
    // ========================================================================
    //
    // MUY IMPORTANTE:
    //
    // .doc(uid)
    //
    // significa que Firestore NO genera un ID nuevo.
    //
    // El documento tendrá exactamente el UID
    // de Firebase Authentication.
    //
    // ========================================================================

    const usuarioRef =
      db
        .collection("usuarios")
        .doc(uid);


    // ========================================================================
    // COMPROBAR SI YA EXISTE
    // ========================================================================

    const usuarioDoc =
      await usuarioRef.get();


    // ========================================================================
    // DATOS A GUARDAR
    // ========================================================================

    const datosUsuario = {


      // ----------------------------------------------------------------------
      // IDENTIDAD
      // ----------------------------------------------------------------------

      uid:
        uid,


      correo:
        correo,


      // ----------------------------------------------------------------------
      // PERFIL
      // ----------------------------------------------------------------------

      edad:
        edad ?? null,


      genero:
        genero ?? null,


      peso:
        peso ?? null,


      estatura:
        estatura ?? null,


      nivelActividad:
        nivelActividad ?? null,


      // ----------------------------------------------------------------------
      // ANTECEDENTES
      // ----------------------------------------------------------------------

      enfermedadesCronicas:
        enfermedadesFinales,


      otraEnfermedadCronica:
        otraEnfermedadCronica ?? "",


      // ----------------------------------------------------------------------
      // FECHA
      // ----------------------------------------------------------------------

      actualizadoEn:
        FieldValue.serverTimestamp(),

    };


    // ========================================================================
    // FECHA DE REGISTRO
    // ========================================================================
    //
    // Solamente se agrega cuando es un documento nuevo.
    //
    // ========================================================================

    if (!usuarioDoc.exists) {

      datosUsuario.fechaRegistro =
        FieldValue.serverTimestamp();
    }


    // ========================================================================
    // GUARDAR
    // ========================================================================
    //
    // Si no existe:
    // → lo crea.
    //
    // Si existe:
    // → actualiza los campos sin borrar los demás.
    //
    // ========================================================================

    await usuarioRef.set(

      datosUsuario,

      {
        merge: true,
      }
    );


    // ========================================================================
    // COMPROBACIÓN
    // ========================================================================
    //
    // Volvemos a leer el documento para verificar
    // que realmente fue escrito.
    //
    // ========================================================================

    const perfilGuardado =
      await usuarioRef.get();


    if (!perfilGuardado.exists) {

      throw new Error(
        "El perfil no pudo ser creado en Firestore."
      );
    }


    // ========================================================================
    // LOGS TEMPORALES
    // ========================================================================
    //
    // Nos servirán para comprobar exactamente
    // qué UID está enviando Android.
    //
    // ========================================================================

    console.log(
      "======================================"
    );

    console.log(
      "PERFIL GUARDADO"
    );

    console.log(
      "UID Authentication:",
      uid
    );

    console.log(
      "Correo:",
      correo
    );

    console.log(
      "Documento Firestore:",
      `usuarios/${uid}`
    );

    console.log(
      "======================================"
    );


    // ========================================================================
    // RESPUESTA
    // ========================================================================

    return res.status(200).json({

      success: true,

      message:
        usuarioDoc.exists
          ? "Perfil actualizado correctamente."
          : "Perfil creado correctamente.",

      // Lo mandamos temporalmente para comprobarlo.
      uid:
        uid,

    });


  } catch (error) {


    console.error(
      "Error en updateMyProfile:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Error al guardar el perfil.",

      error:
        error.message,

    });
  }
}

// ============================================================================
// EXPORTACIONES
// ============================================================================

module.exports = {

  getMyProfile,

  updateMyProfile,

};