// ============================================================================
// NUBY CONTROLLER
// ============================================================================
//
// Consulta profesionales registrados en Vibra la vida.
//
// No crea rankings ni expone datos privados.
//
// ============================================================================

const {
  db,
} = require('../config/firebase')


const normalizar = (valor = '') => {
  return String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}


const palabrasEspecialidad = {
  nutricion: [
    'nutricion',
    'nutriologo',
    'nutriologa',
  ],

  psicologia: [
    'psicologia',
    'psicologo',
    'psicologa',
  ],

  cardiologia: [
    'cardiologia',
    'cardiologo',
    'cardiologa',
  ],

  endocrinologia: [
    'endocrinologia',
    'endocrinologo',
    'endocrinologa',
  ],

  medicina_general: [
    'medicina general',
    'medico general',
    'medica general',
    'medicina familiar',
    'medico familiar',
    'medica familiar',
  ],
}


const esProfesional = (usuario = {}) => {

  const roles =
    Array.isArray(usuario.roles)
      ? usuario.roles
      : []

  return (
    roles.includes('especialista') ||
    usuario.rol === 'profesional_salud' ||
    usuario.rol === 'doctor'
  )
}


const coincideEspecialidad = (
  usuario,
  especialidadSolicitada
) => {

  const palabras =
    palabrasEspecialidad[especialidadSolicitada] || []

  if (palabras.length === 0) {
    return true
  }

  const textoProfesional =
    normalizar(
      [
        usuario.especialidad,
        usuario.profesionRegistrada,
      ]
        .filter(Boolean)
        .join(' ')
    )

  return palabras.some(
    (palabra) =>
      textoProfesional.includes(
        normalizar(palabra)
      )
  )
}


const convertirEspecialistaPublico = (doc) => {

  const usuario =
    doc.data()

  const consultorio =
    usuario.consultorio || {}

  const modalidades = []

  if (usuario.tieneConsultorio) {
    modalidades.push('Presencial')
  }

  if (
    usuario.atencionEnLinea === true ||
    usuario.modalidadEnLinea === true
  ) {
    modalidades.push('En línea')
  }

  return {
    id:
      doc.id,

    nombre:
      usuario.nombreCompleto ||
      usuario.nombre ||
      'Profesional de salud',

    profesion:
      usuario.profesionRegistrada ||
      '',

    especialidad:
      usuario.especialidad ||
      '',

    cedulaProfesional:
      usuario.cedulaProfesional ||
      '',

    modalidad:
      modalidades,

    telefono:
      consultorio.telefono ||
      null,

    ubicacion:
      consultorio.ubicacion ||
      null,

    horarioAtencion:
      consultorio.horarioAtencion ||
      null,
  }
}


const obtenerEspecialistasNuby = async (
  req,
  res
) => {

  try {

    const especialidad =
      normalizar(
        req.query.especialidad || ''
      )

    const limitSolicitado =
      Number.parseInt(
        req.query.limit,
        10
      )

    const limit =
      Number.isFinite(limitSolicitado)
        ? Math.min(
            Math.max(limitSolicitado, 1),
            5
          )
        : 3

    const snapshot =
      await db
        .collection('usuarios')
        .get()

    const especialistas =
      snapshot
        .docs
        .filter(
          (doc) =>
            esProfesional(
              doc.data()
            )
        )
        .filter(
          (doc) =>
            coincideEspecialidad(
              doc.data(),
              especialidad
            )
        )
        .map(
          convertirEspecialistaPublico
        )
        .sort(
          (a, b) =>
            a.nombre.localeCompare(
              b.nombre,
              'es'
            )
        )
        .slice(
          0,
          limit
        )

    return res.json({
      success:
        true,

      especialidadSolicitada:
        especialidad || null,

      especialistas,
    })

  } catch (error) {

    console.error(
      'Error al consultar especialistas para Nuby:',
      error
    )

    return res
      .status(500)
      .json({
        success:
          false,

        message:
          'No fue posible consultar especialistas en este momento.',
      })
  }
}


module.exports = {
  obtenerEspecialistasNuby,
}
