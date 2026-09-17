// ============================================================================
// USER CONTROLLER
// ============================================================================
//
// Maneja:
//
// 1. Perfil del usuario autenticado.
// 2. Sistema multirrol.
// 3. Sincronización con directorio_pacientes.
// 4. Eliminación de la cuenta.
//
// REGLA IMPORTANTE:
//
// Toda persona que use la APP MÓVIL utiliza la aplicación como PACIENTE.
//
// Por ello:
//
// PUT /api/users/me
//
// siempre garantiza que el usuario tenga:
//
// roles: ["paciente"]
//
// Si ya era especialista:
//
// roles: ["especialista", "paciente"]
//
// NO se elimina el rol profesional.
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
// ROLES
// ============================================================================

const {
  normalizarRoles,
  agregarRol,
  obtenerRolLegacy,
} = require("../utils/roles.utils");


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


    if (
      !uid
    ) {

      return res
        .status(401)
        .json({

          success:
            false,

          message:
            "No se pudo identificar al usuario autenticado.",
        });
    }


    const userDoc =
      await db
        .collection("usuarios")
        .doc(uid)
        .get();


    if (
      !userDoc.exists
    ) {

      return res
        .status(404)
        .json({

          success:
            false,

          message:
            "Perfil no encontrado.",
        });
    }


    const datos =
      userDoc.data();


    // ========================================================================
    // NORMALIZAR ROLES AL LEER
    // ========================================================================
    //
    // Esto permite seguir funcionando con usuarios antiguos
    // que todavía tengan solamente "rol".
    //
    // ========================================================================

    const roles =
      normalizarRoles(

        datos.roles,

        datos.rol
      );


    return res.json({

      success:
        true,

      user: {

        ...datos,

        roles,
      },
    });


  } catch (
    error
  ) {

    console.error(
      "Error en getMyProfile:",
      error
    );


    return res
      .status(500)
      .json({

        success:
          false,

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
// Esta ruta es utilizada por la app móvil.
//
// Por lo tanto:
//
// - siempre agrega el rol "paciente"
// - nunca elimina "especialista"
// - crea/actualiza directorio_pacientes/{uid}
//
// ============================================================================

async function updateMyProfile(
  req,
  res
) {

  try {

    // ========================================================================
    // IDENTIDAD DEL TOKEN
    // ========================================================================

    const uid =
      req.user?.uid;


    const correoToken =
      req.user?.email ?? null;


    if (
      !uid
    ) {

      return res
        .status(401)
        .json({

          success:
            false,

          message:
            "No se pudo identificar al usuario autenticado.",
        });
    }


    // ========================================================================
    // BODY
    // ========================================================================

    const body =
      req.body || {};


    const {

      nombreCompleto: nombreRecibido,

      edad,

      genero,

      peso,

      estatura,

      nivelActividad,

      enfermedadesCronicas,

      otraEnfermedadCronica,

      fotoPerfilUrl,

    } = body;


    // ========================================================================
    // DOCUMENTO ACTUAL
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
    // FIREBASE AUTH
    // ========================================================================

    const usuarioAuth =
      await auth.getUser(
        uid
      );


    // ========================================================================
    // CORREO
    // ========================================================================

    const correo =
      correoToken ||
      usuarioAuth.email ||
      datosExistentes.correo ||
      null;


    // ========================================================================
    // NOMBRE
    // ========================================================================

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
    // ROLES EXISTENTES
    // ========================================================================
    //
    // Soporta tanto:
    //
    // roles: [...]
    //
    // como el campo viejo:
    //
    // rol: "usuario"
    // rol: "especialista"
    //
    // ========================================================================

    const rolesExistentes =
      normalizarRoles(

        datosExistentes.roles,

        datosExistentes.rol
      );


    // ========================================================================
    // ANDROID = USO COMO PACIENTE
    // ========================================================================
    //
    // Si ya era especialista:
    //
    // ["especialista"]
    //
    // se convierte en:
    //
    // ["especialista", "paciente"]
    //
    // ========================================================================

    const rolesFinales =
      agregarRol(

        rolesExistentes,

        "paciente"
      );


    // ========================================================================
    // CAMPO LEGACY
    // ========================================================================
    //
    // Se conserva temporalmente para no romper el login web actual.
    //
    // Especialista + paciente:
    //
    // rol = "especialista"
    //
    // roles = ["especialista", "paciente"]
    //
    // ========================================================================

    const rolLegacy =
      obtenerRolLegacy(
        rolesFinales
      );


    // ========================================================================
    // ENFERMEDADES
    // ========================================================================

    const enfermedadesFinales =
      Array.isArray(
        enfermedadesCronicas
      )
        ? enfermedadesCronicas
        : (
            Array.isArray(
              datosExistentes.enfermedadesCronicas
            )
              ? datosExistentes.enfermedadesCronicas
              : []
          );


    // ========================================================================
    // FOTO DE PERFIL
    // ========================================================================
    //
    // Si el campo NO viene en el request:
    // conservamos la foto existente.
    //
    // Si viene:
    // solamente aceptamos HTTPS de Cloudinary.
    //
    // ========================================================================

    let fotoPerfilFinal =
      datosExistentes.fotoPerfilUrl ??
      null;


    if (
      fotoPerfilUrl !== undefined &&
      fotoPerfilUrl !== null
    ) {

      if (
        typeof fotoPerfilUrl !==
        "string"
      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            message:
              "La URL de la foto de perfil no es válida.",
          });
      }


      const fotoLimpia =
        fotoPerfilUrl.trim();


      if (
        fotoLimpia.length >
        2048
      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            message:
              "La URL de la foto de perfil es demasiado larga.",
          });
      }


      try {

        const fotoUrl =
          new URL(
            fotoLimpia
          );


        if (
          fotoUrl.protocol !==
          "https:" ||
          fotoUrl.hostname !==
          "res.cloudinary.com"
        ) {

          return res
            .status(400)
            .json({

              success:
                false,

              message:
                "La foto de perfil debe provenir de Cloudinary.",
            });
        }


        fotoPerfilFinal =
          fotoLimpia;


      } catch (_) {

        return res
          .status(400)
          .json({

            success:
              false,

            message:
              "La URL de la foto de perfil no es válida.",
          });
      }
    }


    // ========================================================================
    // DATOS DEL USUARIO
    // ========================================================================

    const datosUsuario = {

      // ----------------------------------------------------------------------
      // IDENTIDAD
      // ----------------------------------------------------------------------

      uid,

      correo,

      nombreCompleto,


      // ----------------------------------------------------------------------
      // ROLES
      // ----------------------------------------------------------------------

      roles:
        rolesFinales,


      // ----------------------------------------------------------------------
      // COMPATIBILIDAD TEMPORAL
      // ----------------------------------------------------------------------

      rol:
        rolLegacy,


      // ----------------------------------------------------------------------
      // PERFIL DE PACIENTE
      // ----------------------------------------------------------------------

      edad:
        edad ??
        datosExistentes.edad ??
        null,


      genero:
        genero ??
        datosExistentes.genero ??
        null,


      peso:
        peso ??
        datosExistentes.peso ??
        null,


      estatura:
        estatura ??
        datosExistentes.estatura ??
        null,


      nivelActividad:
        nivelActividad ??
        datosExistentes.nivelActividad ??
        null,


      enfermedadesCronicas:
        enfermedadesFinales,


      otraEnfermedadCronica:
        otraEnfermedadCronica ??
        datosExistentes.otraEnfermedadCronica ??
        "",


      // ----------------------------------------------------------------------
      // FOTO DE PERFIL
      // ----------------------------------------------------------------------

      fotoPerfilUrl:
        fotoPerfilFinal,


      // ----------------------------------------------------------------------
      // FECHA
      // ----------------------------------------------------------------------

      actualizadoEn:
        FieldValue.serverTimestamp(),
    };


    // ========================================================================
    // FECHA DE REGISTRO
    // ========================================================================

    if (
      !usuarioDoc.exists
    ) {

      datosUsuario.fechaRegistro =
        FieldValue.serverTimestamp();
    }


    // ========================================================================
    // GUARDAR USUARIO
    // ========================================================================

    await usuarioRef.set(

      datosUsuario,

      {
        merge:
          true,
      }
    );


    // ========================================================================
    // DIRECTORIO DE PACIENTES
    // ========================================================================
    //
    // Como esta ruta corresponde al uso de la APP móvil,
    // la persona está utilizando Vibra la vida como paciente.
    //
    // Por eso se agrega al directorio.
    //
    // ========================================================================

    const directorioRef =
      db
        .collection("directorio_pacientes")
        .doc(uid);


    const directorioDoc =
      await directorioRef.get();


    const datosDirectorio = {

      uid,

      nombreCompleto,

      nombreBusqueda:
        nombreCompleto
          .toLowerCase(),

      actualizadoEn:
        FieldValue.serverTimestamp(),
    };


    if (
      !directorioDoc.exists
    ) {

      datosDirectorio.fechaRegistro =
        FieldValue.serverTimestamp();
    }


    await directorioRef.set(

      datosDirectorio,

      {
        merge:
          true,
      }
    );


    // ========================================================================
    // RESPUESTA
    // ========================================================================

    console.log(
      "======================================"
    );

    console.log(
      "PERFIL DE PACIENTE SINCRONIZADO"
    );

    console.log(
      "UID:",
      uid
    );

    console.log(
      "Nombre:",
      nombreCompleto
    );

    console.log(
      "Roles:",
      rolesFinales
    );

    console.log(
      "Rol legacy:",
      rolLegacy
    );

    console.log(
      "======================================"
    );


    return res
      .status(200)
      .json({

        success:
          true,

        message:
          usuarioDoc.exists
            ? "Perfil actualizado correctamente."
            : "Perfil creado correctamente.",

        uid,

        roles:
          rolesFinales,
      });


  } catch (
    error
  ) {

    console.error(
      "Error en updateMyProfile:",
      error
    );


    return res
      .status(500)
      .json({

        success:
          false,

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
// IMPORTANTE CON EL NUEVO SISTEMA MULTIRROL:
//
// Esta función todavía elimina la CUENTA COMPLETA:
//
// - perfil paciente
// - subcolecciones
// - directorio_pacientes
// - Firebase Authentication
//
// Si una persona tiene:
//
// roles = ["paciente", "especialista"]
//
// eliminar toda la cuenta también cerraría su acceso profesional.
//
// Por eso, antes de permitir borrado total a una cuenta multirrol,
// bloqueamos la operación y pedimos separar la eliminación del
// perfil paciente de la eliminación total de la cuenta.
//
// ============================================================================

async function deleteMyAccount(
  req,
  res
) {

  try {

    const uid =
      req.user?.uid;


    if (
      !uid
    ) {

      return res
        .status(401)
        .json({

          success:
            false,

          message:
            "No se pudo identificar al usuario autenticado.",
        });
    }


    // ========================================================================
    // LEER ROLES
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


    const roles =
      normalizarRoles(

        datosUsuario.roles,

        datosUsuario.rol
      );


    // ========================================================================
    // PROTEGER CUENTAS MULTIRROL
    // ========================================================================
    //
    // Evitamos que un especialista borre por accidente
    // también su acceso profesional desde la app paciente.
    //
    // ========================================================================

    if (
      roles.includes("especialista") &&
      roles.includes("paciente")
    ) {

      return res
        .status(409)
        .json({

          success:
            false,

          code:
            "MULTI_ROLE_ACCOUNT",

          message:
            "Esta cuenta también tiene acceso profesional. No puede eliminarse completamente desde la app de paciente.",
        });
    }


    // ========================================================================
    // DIRECTORIO
    // ========================================================================

    const directorioRef =
      db
        .collection("directorio_pacientes")
        .doc(uid);


    // ========================================================================
    // ELIMINAR PERFIL Y SUBCOLECCIONES
    // ========================================================================

    await db.recursiveDelete(
      usuarioRef
    );


    // ========================================================================
    // ELIMINAR DEL DIRECTORIO
    // ========================================================================

    await directorioRef.delete();


    // ========================================================================
    // ELIMINAR AUTH
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

        success:
          true,

        message:
          "Cuenta eliminada correctamente.",
      });


  } catch (
    error
  ) {

    console.error(
      "Error en deleteMyAccount:",
      error
    );


    return res
      .status(500)
      .json({

        success:
          false,

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
