// ============================================================================
// PROFESIONALES MAPA CONTROLLER
// ============================================================================
//
// Devuelve los profesionales que pueden mostrarse en el mapa de Vibra la vida.
//
// Fuente principal:
// perfiles_profesionales/{uid}
//
// Para aparecer en el mapa el profesional debe:
//
// - tener consultorio;
// - tener latitud;
// - tener longitud.
//
// La ubicación que se publica corresponde únicamente al consultorio.
// Nunca se expone una ubicación personal o en tiempo real.
//
// ============================================================================


// ============================================================================
// FIREBASE
// ============================================================================

const {
  db,
} =
  require("../config/firebase");


// ============================================================================
// CONVERTIR A NÚMERO
// ============================================================================
//
// Firestore puede contener coordenadas guardadas como Number o como String.
//
// Ejemplos válidos:
//
// 18.5001
// "18.5001"
//
// ============================================================================

const convertirNumero = (
  valor
) => {

  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {

    return null;
  }


  const numero =
    Number(
      valor
    );


  return Number.isFinite(
    numero
  )
    ? numero
    : null;
};


// ============================================================================
// VALIDAR COORDENADAS
// ============================================================================

const coordenadasValidas = (
  latitud,
  longitud
) => {

  return (
    Number.isFinite(latitud) &&
    Number.isFinite(longitud) &&
    latitud >= -90 &&
    latitud <= 90 &&
    longitud >= -180 &&
    longitud <= 180
  );
};


// ============================================================================
// CONSTRUIR PROFESIONAL PÚBLICO
// ============================================================================

const construirProfesionalMapa = (
  perfilDoc,
  usuario = {}
) => {

  const perfil =
    perfilDoc.data() || {};


  const consultorio =

    perfil.consultorio &&
    typeof perfil.consultorio === "object"

      ? perfil.consultorio

      : {};


  const latitud =
    convertirNumero(
      consultorio.latitud
    );


  const longitud =
    convertirNumero(
      consultorio.longitud
    );


  // Si no tiene consultorio o las coordenadas no son válidas,
  // este perfil no debe aparecer en el mapa.
  if (
    perfil.tieneConsultorio !== true ||
    !coordenadasValidas(
      latitud,
      longitud
    )
  ) {

    return null;
  }


  return {

    id:
      perfilDoc.id,

    nombre:
      perfil.nombreCompleto ||
      usuario.nombreCompleto ||
      usuario.nombre ||
      "Profesional de salud",

    profesion:
      perfil.profesionRegistrada ||
      perfil.profesion ||
      usuario.profesionRegistrada ||
      "",

    especialidad:
      perfil.especialidad ||
      usuario.especialidad ||
      "",

    cedulaProfesional:
      perfil.cedulaProfesional ||
      perfil.cedula ||
      usuario.cedulaProfesional ||
      "",

    cedulaVerificada:
      Boolean(
        perfil.cedulaVerificada
      ),

    consultorio: {

      nombre:
        consultorio.nombre ||
        "Consultorio",

      direccion:
        consultorio.direccion ||
        consultorio.ubicacion ||
        null,

      telefono:
        consultorio.telefono ||
        null,

      horario:
        consultorio.horario ||
        consultorio.horarioAtencion ||
        null,

      latitud,

      longitud,
    },
  };
};


// ============================================================================
// GET /API/PROFESIONALES/MAPA
// ============================================================================

const obtenerProfesionalesMapa = async (
  req,
  res
) => {

  try {


    // ========================================================================
    // LEER PERFILES PROFESIONALES
    // ========================================================================

    const perfilesSnapshot =
      await db
        .collection(
          "perfiles_profesionales"
        )
        .get();


    const profesionales =
      [];


    // ========================================================================
    // CONSTRUIR RESPUESTA
    // ========================================================================
    //
    // También consultamos usuarios/{uid} únicamente como respaldo para
    // nombre, profesión o especialidad si el perfil profesional no los tiene.
    //
    // ========================================================================

    for (
      const perfilDoc of perfilesSnapshot.docs
    ) {


      const usuarioDoc =
        await db
          .collection(
            "usuarios"
          )
          .doc(
            perfilDoc.id
          )
          .get();


      const usuario =
        usuarioDoc.exists
          ? usuarioDoc.data()
          : {};


      const profesional =
        construirProfesionalMapa(
          perfilDoc,
          usuario
        );


      if (
        profesional
      ) {

        profesionales.push(
          profesional
        );
      }
    }


    // ========================================================================
    // ORDENAR
    // ========================================================================

    profesionales.sort(
      (a, b) =>
        a.nombre.localeCompare(
          b.nombre,
          "es"
        )
    );


    // ========================================================================
    // RESPUESTA
    // ========================================================================

    return res.json({

      success:
        true,

      total:
        profesionales.length,

      profesionales,
    });


  } catch (
    error
  ) {


    console.error(
      "Error consultando profesionales para el mapa:",
      error
    );


    return res
      .status(
        500
      )
      .json({

        success:
          false,

        message:
          "No fue posible consultar los profesionales del mapa.",
      });
  }
};


// ============================================================================
// EXPORTACIONES
// ============================================================================

module.exports = {

  obtenerProfesionalesMapa,

};
