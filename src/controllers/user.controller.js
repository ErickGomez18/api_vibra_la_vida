// ============================================================================
// USER CONTROLLER
// ============================================================================
//
// Este controlador maneja:
//
// 1. El perfil del usuario autenticado.
// 2. La sincronización con directorio_pacientes.
// 3. La eliminación de la cuenta.
//
// El UID NO viene del body.
//
// El UID se obtiene del token de Firebase mediante
// auth.middleware.js.
//
// ============================================================================


// Importamos Firestore, Authentication y FieldValue.
const {
  db,
  auth,
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

      user:
        userDoc.data(),

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
// Además:
//
// → sincroniza directorio_pacientes/{uid}
//
// Esto permite que el profesional encuentre al paciente
// desde el panel web.
//
// ============================================================================

async function updateMyProfile(req, res) {

  try {


    // ========================================================================
    // USUARIO OBTENIDO DEL TOKEN
    // ========================================================================

    const uid =
      req.user?.uid;

    const correo =
      req.user?.email ?? null;


    // ========================================================================
    // VALIDAR UID
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
    // REFERENCIA DEL DOCUMENTO EN USUARIOS
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
    // RECUPERAR DATOS EXISTENTES
    // ========================================================================

    const datosExistentes =
      usuarioDoc.exists
        ? usuarioDoc.data()
        : {};


    // ========================================================================
    // OBTENER USUARIO DESDE FIREBASE AUTHENTICATION
    // ========================================================================
    //
    // Esto sirve para recuperar displayName directamente desde Auth.
    //
    // Es importante porque el token puede no incluir todavía el nombre.
    //
    // ========================================================================

    const usuarioAuth =
      await auth.getUser(
        uid
      );


    // ========================================================================
    // NOMBRE COMPLETO
    // ========================================================================
    //
    // Buscamos el nombre en este orden:
    //
    // 1. nombreCompleto ya guardado en Firestore
    // 2. nombre ya guardado en Firestore
    // 3. displayName de Firebase Authentication
    // 4. name del token
    // 5. cadena vacía
    //
    // ========================================================================

    const nombreCompleto =
      datosExistentes.nombreCompleto ||
      datosExistentes.nombre ||
      usuarioAuth.displayName ||
      req.user?.name ||
      "";


    // ========================================================================
    // DATOS A GUARDAR EN USUARIOS
    // ========================================================================

    const datosUsuario = {


      // ----------------------------------------------------------------------
      // IDENTIDAD
      // ----------------------------------------------------------------------

      uid:
        uid,


      correo:
        correo,


      nombreCompleto:
        nombreCompleto,


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
      // FECHA DE ACTUALIZACIÓN
      // ----------------------------------------------------------------------

      actualizadoEn:
        FieldValue.serverTimestamp(),

    };


    // ========================================================================
    // FECHA DE REGISTRO DEL USUARIO
    // ========================================================================
    //
    // Solo se crea si el documento todavía no existe.
    //
    // ========================================================================

    if (!usuarioDoc.exists) {

      datosUsuario.fechaRegistro =
        FieldValue.serverTimestamp();
    }


    // ========================================================================
    // GUARDAR / ACTUALIZAR USUARIO
    // ========================================================================

    await usuarioRef.set(

      datosUsuario,

      {
        merge: true,
      }
    );


    // ========================================================================
    // DIRECTORIO DE PACIENTES
    // ========================================================================
    //
    // Esta colección es utilizada por el panel web del profesional.
    //
    // Usamos el MISMO UID:
    //
    // usuarios/{uid}
    //
    // directorio_pacientes/{uid}
    //
    // ========================================================================

    const directorioRef =
      db
        .collection("directorio_pacientes")
        .doc(uid);


    // ========================================================================
    // COMPROBAR SI YA EXISTE EN EL DIRECTORIO
    // ========================================================================

    const directorioDoc =
      await directorioRef.get();


    // ========================================================================
    // DATOS DEL DIRECTORIO
    // ========================================================================

    const datosDirectorio = {


      // ----------------------------------------------------------------------
      // IDENTIFICADOR
      // ----------------------------------------------------------------------

      uid:
        uid,


      // ----------------------------------------------------------------------
      // NOMBRE
      // ----------------------------------------------------------------------

      nombreCompleto:
        nombreCompleto,


      // ----------------------------------------------------------------------
      // NOMBRE PARA BÚSQUEDA
      // ----------------------------------------------------------------------
      //
      // Lo guardamos en minúsculas para facilitar las búsquedas
      // realizadas desde el panel web.
      //
      // ----------------------------------------------------------------------

      nombreBusqueda:
        nombreCompleto
          .trim()
          .toLowerCase(),


      // ----------------------------------------------------------------------
      // FECHA DE ACTUALIZACIÓN
      // ----------------------------------------------------------------------

      actualizadoEn:
        FieldValue.serverTimestamp(),

    };


    // ========================================================================
    // FECHA DE REGISTRO EN EL DIRECTORIO
    // ========================================================================
    //
    // Solo se guarda una vez.
    //
    // ========================================================================

    if (!directorioDoc.exists) {

      datosDirectorio.fechaRegistro =
        FieldValue.serverTimestamp();
    }


    // ========================================================================
    // GUARDAR / ACTUALIZAR DIRECTORIO
    // ========================================================================

    await directorioRef.set(

      datosDirectorio,

      {
        merge: true,
      }
    );


    // ========================================================================
    // COMPROBACIÓN
    // ========================================================================

    const perfilGuardado =
      await usuarioRef.get();


    if (!perfilGuardado.exists) {

      throw new Error(
        "El perfil no pudo ser creado en Firestore."
      );
    }


    // ========================================================================
    // LOGS
    // ========================================================================

    console.log(
      "======================================"
    );

    console.log(
      "PERFIL GUARDADO Y SINCRONIZADO"
    );

    console.log(
      "UID:",
      uid
    );

    console.log(
      "Correo:",
      correo
    );

    console.log(
      "Nombre:",
      nombreCompleto
    );

    console.log(
      "Usuario:",
      `usuarios/${uid}`
    );

    console.log(
      "Directorio:",
      `directorio_pacientes/${uid}`
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
// ELIMINAR MI CUENTA
// ============================================================================
//
// DELETE /api/users/me
//
// Elimina:
//
// 1. usuarios/{uid}
//
// 2. Todas las subcolecciones del usuario.
//
// Ejemplos:
//
// usuarios/{uid}/medicamentos
// usuarios/{uid}/adherenciaMedicamentos
// usuarios/{uid}/laboratorios
// etc.
//
// 3. directorio_pacientes/{uid}
//
// 4. Usuario de Firebase Authentication.
//
// ============================================================================

async function deleteMyAccount(req, res) {

  try {


    // ========================================================================
    // UID DEL USUARIO AUTENTICADO
    // ========================================================================

    const uid =
      req.user?.uid;


    // ========================================================================
    // VALIDAR UID
    // ========================================================================

    if (!uid) {

      return res.status(401).json({

        success: false,

        message:
          "No se pudo identificar al usuario autenticado.",

      });
    }


    // ========================================================================
    // REFERENCIA DEL USUARIO
    // ========================================================================

    const usuarioRef =
      db
        .collection("usuarios")
        .doc(uid);


    // ========================================================================
    // REFERENCIA DEL DIRECTORIO
    // ========================================================================

    const directorioRef =
      db
        .collection("directorio_pacientes")
        .doc(uid);


    // ========================================================================
    // ELIMINAR FIRESTORE DE FORMA RECURSIVA
    // ========================================================================
    //
    // Esto elimina:
    //
    // usuarios/{uid}
    //
    // y todas sus subcolecciones.
    //
    // ========================================================================

    await db.recursiveDelete(
      usuarioRef
    );


    // ========================================================================
    // ELIMINAR DEL DIRECTORIO DE PACIENTES
    // ========================================================================

    await directorioRef.delete();


    // ========================================================================
    // ELIMINAR FIREBASE AUTHENTICATION
    // ========================================================================

    await auth.deleteUser(
      uid
    );


    // ========================================================================
    // LOG
    // ========================================================================

    console.log(
      "======================================"
    );

    console.log(
      "CUENTA ELIMINADA"
    );

    console.log(
      "UID:",
      uid
    );

    console.log(
      "Usuario eliminado:",
      `usuarios/${uid}`
    );

    console.log(
      "Directorio eliminado:",
      `directorio_pacientes/${uid}`
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
        "Cuenta eliminada correctamente.",

    });


  } catch (error) {


    console.error(
      "Error en deleteMyAccount:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Error al eliminar la cuenta.",

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

  deleteMyAccount,

};