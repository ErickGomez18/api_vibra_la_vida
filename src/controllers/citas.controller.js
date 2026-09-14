// ==========================================================
// CONTROLADOR DE CITAS - VIBRA LA VIDA
// ==========================================================

const {
  db,
  FieldValue,
} = require('../config/firebase')


// ----------------------------------------------------------
// OBTENER USUARIO AUTENTICADO DESDE FIRESTORE
// ----------------------------------------------------------

const obtenerUsuarioActual = async (uid) => {
  const ref = db.collection('usuarios').doc(uid)
  const snap = await ref.get()

  if (!snap.exists) {
    return null
  }

  return {
    id: snap.id,
    ...snap.data(),
  }
}


// ----------------------------------------------------------
// COMPROBAR SI ES PROFESIONAL DE SALUD
// ----------------------------------------------------------

const esProfesionalSalud = (usuario) => {
  return (
    usuario?.rol === 'profesional_salud' ||
    usuario?.rol === 'doctor'
  )
}


// ----------------------------------------------------------
// CONVERTIR FECHA/HORA A MILISEGUNDOS PARA ORDENAR
// ----------------------------------------------------------

const fechaHoraMillis = (fecha = '', hora = '') => {
  try {
    const [dia, mes, anio] = fecha.split('/')
    return new Date(`${anio}-${mes}-${dia}T${hora || '00:00'}:00`).getTime()
  } catch {
    return 0
  }
}


// ----------------------------------------------------------
// OBTENER MIS CITAS
// ----------------------------------------------------------
// Profesional: citas donde especialistaUid = su UID.
// Paciente: citas donde pacienteUid = su UID.
// ----------------------------------------------------------

const obtenerMisCitas = async (req, res) => {
  try {
    const uid = req.user.uid
    const usuario = await obtenerUsuarioActual(uid)

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró el perfil del usuario.',
      })
    }

    const campo = esProfesionalSalud(usuario)
      ? 'especialistaUid'
      : 'pacienteUid'

    const snapshot = await db
      .collection('citas')
      .where(campo, '==', uid)
      .get()

    const citas = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort(
        (a, b) =>
          fechaHoraMillis(a.fecha, a.hora) -
          fechaHoraMillis(b.fecha, b.hora)
      )

    return res.json({
      success: true,
      citas,
    })
  } catch (error) {
    console.error('Error al obtener citas:', error)

    return res.status(500).json({
      success: false,
      message: 'No fue posible obtener las citas.',
    })
  }
}


// ----------------------------------------------------------
// CREAR CITA
// ----------------------------------------------------------
// Solo un profesional puede crearla.
// El especialistaUid, nombre y especialidad se obtienen del
// usuario autenticado; NO se confían al cliente.
// ----------------------------------------------------------

const crearCita = async (req, res) => {
  try {
    const uid = req.user.uid
    const profesional = await obtenerUsuarioActual(uid)

    if (!esProfesionalSalud(profesional)) {
      return res.status(403).json({
        success: false,
        message: 'Solo un profesional de salud puede crear citas.',
      })
    }

    const {
      pacienteUid,
      fecha,
      hora,
      motivo = '',
      lugar = '',
      modalidad = 'Presencial',
      notas = '',
      recordatorioActivo = true,
    } = req.body || {}

    if (!pacienteUid || !fecha || !hora) {
      return res.status(400).json({
        success: false,
        message: 'Paciente, fecha y hora son obligatorios.',
      })
    }

    const paciente = await obtenerUsuarioActual(pacienteUid)

    if (!paciente) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró el paciente seleccionado.',
      })
    }

    const citaRef = db.collection('citas').doc()

    const nuevaCita = {
      pacienteUid,
      nombrePaciente:
        paciente.nombreCompleto ||
        paciente.nombre ||
        'Paciente',

      especialistaUid: uid,
      nombreEspecialista:
        profesional.nombreCompleto ||
        profesional.nombre ||
        'Profesional de salud',
      especialidad: profesional.especialidad || '',

      fecha,
      hora,
      zonaHoraria: 'America/Cancun',
      motivo: String(motivo).trim(),
      lugar: String(lugar).trim(),
      modalidad,
      notas: String(notas).trim(),
      estado: 'pendiente',
      recordatorioActivo: Boolean(recordatorioActivo),

      creadoPor: uid,
      creadoEn: FieldValue.serverTimestamp(),
      actualizadoEn: FieldValue.serverTimestamp(),
    }

    await citaRef.set(nuevaCita)

    return res.status(201).json({
      success: true,
      cita: {
        id: citaRef.id,
        ...nuevaCita,
      },
    })
  } catch (error) {
    console.error('Error al crear cita:', error)

    return res.status(500).json({
      success: false,
      message: 'No fue posible crear la cita.',
    })
  }
}


// ----------------------------------------------------------
// ACTUALIZAR CITA
// ----------------------------------------------------------
// Solo el profesional propietario de la cita puede editarla.
// ----------------------------------------------------------

const actualizarCita = async (req, res) => {
  try {
    const uid = req.user.uid
    const profesional = await obtenerUsuarioActual(uid)

    if (!esProfesionalSalud(profesional)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para editar citas.',
      })
    }

    const citaRef = db.collection('citas').doc(req.params.id)
    const snapshot = await citaRef.get()

    if (!snapshot.exists) {
      return res.status(404).json({
        success: false,
        message: 'La cita no existe.',
      })
    }

    const citaActual = snapshot.data()

    if (citaActual.especialistaUid !== uid) {
      return res.status(403).json({
        success: false,
        message: 'No puedes modificar una cita de otro profesional.',
      })
    }

    const permitidos = [
      'fecha',
      'hora',
      'motivo',
      'lugar',
      'modalidad',
      'notas',
      'estado',
      'recordatorioActivo',
    ]

    const cambios = {}

    permitidos.forEach((campo) => {
      if (Object.prototype.hasOwnProperty.call(req.body, campo)) {
        cambios[campo] = req.body[campo]
      }
    })

    cambios.actualizadoEn = FieldValue.serverTimestamp()

    await citaRef.update(cambios)

    const actualizada = await citaRef.get()

    return res.json({
      success: true,
      cita: {
        id: actualizada.id,
        ...actualizada.data(),
      },
    })
  } catch (error) {
    console.error('Error al actualizar cita:', error)

    return res.status(500).json({
      success: false,
      message: 'No fue posible actualizar la cita.',
    })
  }
}


// ----------------------------------------------------------
// ELIMINAR CITA
// ----------------------------------------------------------
// Solo el profesional propietario puede eliminarla.
// ----------------------------------------------------------

const eliminarCita = async (req, res) => {
  try {
    const uid = req.user.uid
    const profesional = await obtenerUsuarioActual(uid)

    if (!esProfesionalSalud(profesional)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar citas.',
      })
    }

    const citaRef = db.collection('citas').doc(req.params.id)
    const snapshot = await citaRef.get()

    if (!snapshot.exists) {
      return res.status(404).json({
        success: false,
        message: 'La cita no existe.',
      })
    }

    if (snapshot.data().especialistaUid !== uid) {
      return res.status(403).json({
        success: false,
        message: 'No puedes eliminar una cita de otro profesional.',
      })
    }

    await citaRef.delete()

    return res.json({
      success: true,
      message: 'Cita eliminada correctamente.',
    })
  } catch (error) {
    console.error('Error al eliminar cita:', error)

    return res.status(500).json({
      success: false,
      message: 'No fue posible eliminar la cita.',
    })
  }
}


module.exports = {
  obtenerMisCitas,
  crearCita,
  actualizarCita,
  eliminarCita,
}
