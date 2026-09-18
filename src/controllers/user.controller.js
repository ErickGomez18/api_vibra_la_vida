// ============================================================================
// USER CONTROLLER - VIBRA LA VIDA
// ============================================================================
//
// INTEGRACIÓN SEGURA APP MÓVIL -> API -> FIRESTORE -> WEB
//
// Esta versión conserva el sistema ACTUAL de la web:
//
//   rol: "usuario"
//   rol: "profesional_salud"
//   rol: "doctor"
//
// TODAVÍA NO migramos a "roles: []".
//
// OBJETIVOS:
//
// 1. La app Android puede crear/actualizar usuarios/{uid}.
// 2. Si el usuario es paciente, también se crea/actualiza:
//      directorio_pacientes/{uid}
// 3. Los datos existentes NO se borran cuando Android manda
//    solamente algunos campos.
// 4. Una cuenta profesional existente conserva su rol.
// 5. Se conserva y actualiza fotoPerfilUrl.
// 6. Al eliminar una cuenta paciente también se elimina su
//    registro del directorio.
//
// ============================================================================


// ============================================================================
// FIREBASE
// ============================================================================

const {
  db,
  auth,
  FieldValue,
} = require("../config/firebase");


// ============================================================================
// FUNCIÓN AUXILIAR: NORMALIZAR NOMBRE PARA BÚSQUEDA
// ============================================================================

function normalizarNombreBusqueda(
  texto = ""
) {

  return String(texto)
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


// ============================================================================
// OBTENER MI PERFIL
// ============================================================================
//
// GET /api/users/me
//
// ============================================================================

async function getMyProfile(
  req,
  res
) {

  try {

    const uid =
      req.user?.uid;


    if (!uid) {

      return res
        .status(401)
        .json({

          success: false,

          message:
            "No se pudo identificar al usuario autenticado.",
        });
    }


    const userDoc =
      await db
        .collection("usuarios")
        .doc(uid)
        .get();


    if (!userDoc.exists) {

      return res
        .status(404)
        .json({

          success: false,

          message:
            "Perfil no encontrado.",
        });
    }


    return res.json({

      success: true,

      user: {
        id: userDoc.id,
        ...userDoc.data(),
      },
    });


  } catch (error) {

    console.error(
      "Error en getMyProfile:",
      error
    );


    return res
      .status(500)
      .json({

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
// Android crea/inicia sesión con Firebase Authentication
//                     ↓
// manda su token a Express
//                     ↓
// PUT /api/users/me
//                     ↓
// usuarios/{uid}
//                     ↓
// si es paciente:
// directorio_pacientes/{uid}
//
// IMPORTANTE:
// Si Android no manda un campo, conservamos el valor existente.
// ============================================================================

async function updateMyProfile(
  req,
  res
) {

  try {

    // ========================================================================
    // 1. IDENTIDAD DESDE EL TOKEN
    // ========================================================================

    const uid =
      req.user?.uid;


    if (!uid) {

      return res
        .status(401)
        .json({

          success: false,

          message:
            "No se pudo identificar al usuario autenticado.",
        });
    }


    const body =
      req.body || {};


    // ========================================================================
    // 2. DOCUMENTO ACTUAL
    // ========================================================================

    const usuarioRef =
      db
        .collection("usuarios")
        .doc(uid);


    const usuarioDoc =
      await usuarioRef.get();


    const datosExistentes =
      usuarioDoc.exists
        ? usuarioDoc.data()
        : {};


    // ========================================================================
    // 3. DATOS DE FIREBASE AUTHENTICATION
    // ========================================================================

    const usuarioAuth =
      await auth.getUser(
        uid
      );


    const correo =
      req.user?.email ||
      usuarioAuth.email ||
      datosExistentes.correo ||
      null;


    // ========================================================================
    // 4. NOMBRE
    // ========================================================================

    const nombreRecibido =
      typeof body.nombreCompleto ===
        "string"
        ? body.nombreCompleto.trim()
        : "";


    const nombreCompleto =
      (
        nombreRecibido ||
        datosExistentes.nombreCompleto ||
        datosExistentes.nombre ||
        usuarioAuth.displayName ||
        req.user?.name ||
        ""
      )
        .trim();


    // ========================================================================
    // 5. ROL ACTUAL
    // ========================================================================
    //
    // Conservamos el rol existente.
    // Una cuenta nueva creada desde Android queda como "usuario".
    // ========================================================================

    const rolActual =
      datosExistentes.rol ||
      "usuario";


    // ========================================================================
    // 6. ENFERMEDADES CRÓNICAS
    // ========================================================================

    const enfermedadesFinales =
      Array.isArray(
        body.enfermedadesCronicas
      )
        ? body.enfermedadesCronicas
        : (
            Array.isArray(
              datosExistentes.enfermedadesCronicas
            )
              ? datosExistentes.enfermedadesCronicas
              : []
          );


    // ========================================================================
    // 7. FOTO DE PERFIL
    // ========================================================================
    //
    // PerfilRepository.kt puede mandar solamente fotoPerfilUrl.
    // Por eso debemos conservar la anterior cuando no venga en el body.
    // ========================================================================

    const fotoPerfilUrl =
      typeof body.fotoPerfilUrl ===
        "string"
        ? body.fotoPerfilUrl.trim()
        : (
            datosExistentes.fotoPerfilUrl ||
            null
          );


    // ========================================================================
    // 8. DATOS A GUARDAR
    // ========================================================================

    const datosUsuario = {

      uid,

      correo,

      nombreCompleto,

      rol:
        rolActual,

      edad:
        body.edad ??
        datosExistentes.edad ??
        null,

      genero:
        body.genero ??
        datosExistentes.genero ??
        null,

      peso:
        body.peso ??
        datosExistentes.peso ??
        null,

      estatura:
        body.estatura ??
        datosExistentes.estatura ??
        null,

      nivelActividad:
        body.nivelActividad ??
        datosExistentes.nivelActividad ??
        null,

      enfermedadesCronicas:
        enfermedadesFinales,

      otraEnfermedadCronica:
        body.otraEnfermedadCronica ??
        datosExistentes.otraEnfermedadCronica ??
        "",

      fotoPerfilUrl,

      actualizadoEn:
        FieldValue.serverTimestamp(),
    };


    // ========================================================================
    // 9. FECHA DE REGISTRO
    // ========================================================================

    if (!usuarioDoc.exists) {

      datosUsuario.fechaRegistro =
        FieldValue.serverTimestamp();
    }


    // ========================================================================
    // 10. GUARDAR usuarios/{uid}
    // ========================================================================

    await usuarioRef.set(
      datosUsuario,
      {
        merge: true,
      }
    );


    // ========================================================================
    // 11. SINCRONIZAR directorio_pacientes/{uid}
    // ========================================================================
    //
    // Aquí NO guardamos peso, enfermedades ni información clínica.
    // Solo información mínima para búsqueda del paciente.
    // ========================================================================

    if (
      rolActual === "usuario" &&
      nombreCompleto
    ) {

      const directorioRef =
        db
          .collection(
            "directorio_pacientes"
          )
          .doc(uid);


      const directorioDoc =
        await directorioRef.get();


      const datosDirectorio = {

        uid,

        nombreCompleto,

        nombreBusqueda:
          normalizarNombreBusqueda(
            nombreCompleto
          ),
      };


      if (!directorioDoc.exists) {

        datosDirectorio.fechaRegistro =
          FieldValue.serverTimestamp();
      }


      await directorioRef.set(
        datosDirectorio,
        {
          merge: true,
        }
      );
    }


    // ========================================================================
    // 12. RESPUESTA
    // ========================================================================

    const perfilGuardado =
      await usuarioRef.get();


    console.log(
      "======================================"
    );

    console.log(
      "PERFIL SINCRONIZADO DESDE APP"
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
      "Rol:",
      rolActual
    );

    console.log(
      "Documento:",
      `usuarios/${uid}`
    );

    console.log(
      "======================================"
    );


    return res
      .status(200)
      .json({

        success: true,

        message:
          usuarioDoc.exists
            ? "Perfil actualizado correctamente."
            : "Perfil creado correctamente.",

        uid,

        user:
          perfilGuardado.data(),
      });


  } catch (error) {

    console.error(
      "Error en updateMyProfile:",
      error
    );


    return res
      .status(500)
      .json({

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
// ============================================================================

async function deleteMyAccount(
  req,
  res
) {

  try {

    const uid =
      req.user?.uid;


    if (!uid) {

      return res
        .status(401)
        .json({

          success: false,

          message:
            "No se pudo identificar al usuario autenticado.",
        });
    }


    // ========================================================================
    // LEER DATOS ACTUALES
    // ========================================================================

    const usuarioRef =
      db
        .collection("usuarios")
        .doc(uid);


    const usuarioDoc =
      await usuarioRef.get();


    const datosUsuario =
      usuarioDoc.exists
        ? usuarioDoc.data()
        : {};


    // ========================================================================
    // ELIMINAR DIRECTORIO DEL PACIENTE
    // ========================================================================

    if (
      datosUsuario.rol ===
      "usuario"
    ) {

      const directorioRef =
        db
          .collection(
            "directorio_pacientes"
          )
          .doc(uid);


      const directorioDoc =
        await directorioRef.get();


      if (
        directorioDoc.exists
      ) {

        await directorioRef.delete();
      }
    }


    // ========================================================================
    // ELIMINAR PERFIL Y SUBCOLECCIONES
    // ========================================================================

    await db.recursiveDelete(
      usuarioRef
    );


    // ========================================================================
    // ELIMINAR FIREBASE AUTHENTICATION
    // ========================================================================

    await auth.deleteUser(
      uid
    );


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
      "======================================"
    );


    return res
      .status(200)
      .json({

        success: true,

        message:
          "Cuenta eliminada correctamente.",
      });


  } catch (error) {

    console.error(
      "Error en deleteMyAccount:",
      error
    );


    return res
      .status(500)
      .json({

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
