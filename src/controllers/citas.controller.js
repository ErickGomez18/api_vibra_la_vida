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
// COMPROBAR SI ES PACIENTE
// ----------------------------------------------------------

const esPaciente = (usuario) => {
  return usuario?.rol === 'usuario'
}


// ----------------------------------------------------------
// CREAR NOTIFICACIÓN PARA EL PROFESIONAL
// ----------------------------------------------------------
//
// Se ejecuta desde Express, por eso funciona igual
// si la acción viene de Android o de la web.
// ----------------------------------------------------------

const crearNotificacionProfesional = async ({
  profesionalUid,
  pacienteUid,
  citaId,
  tipo,
  titulo,
  mensaje,
  detalle = '',
}) => {
  try {
    if (!profesionalUid) {
      return
    }

    await db
      .collection('notificaciones_profesional')
      .add({
        profesionalUid,
        pacienteUid:
          pacienteUid || null,

        citaId:
          citaId || null,

        tipo,
        titulo,
        mensaje,
        detalle,

        leida:
          false,

        creadoEn:
          FieldValue.serverTimestamp(),
      })

  } catch (error) {
    console.error(
      'No fue posible crear la notificación:',
      error
    )
  }
}


// ----------------------------------------------------------
// COMPROBAR AUTENTICACIÓN RECIENTE
// ----------------------------------------------------------
//
// Firebase incluye auth_time en el ID Token.
// Después de reauthenticateWithCredential() el frontend
// solicita un token nuevo.
//
// Exigimos que esa autenticación haya ocurrido hace
// menos de 2 minutos para confirmar una cita.
// ----------------------------------------------------------

const tieneAutenticacionReciente = (
  usuarioToken,
  maxSegundos = 120
) => {
  const authTime =
    Number(
      usuarioToken?.auth_time
    )

  if (
    !Number.isFinite(authTime)
  ) {
    return false
  }

  const ahora =
    Math.floor(
      Date.now() / 1000
    )

  return (
    ahora - authTime <=
    maxSegundos
  )
}


// ----------------------------------------------------------
// CONVERTIR FECHA/HORA A MILISEGUNDOS PARA ORDENAR
// ----------------------------------------------------------

const fechaHoraMillis = (fecha = '', hora = '') => {
  try {
    const [dia, mes, anio] = fecha.split('/')

    return new Date(
      `${anio}-${mes}-${dia}T${hora || '00:00'}:00`
    ).getTime()
  } catch {
    return 0
  }
}


// ----------------------------------------------------------
// OBTENER MIS CITAS
// ----------------------------------------------------------
// Profesional:
//   citas donde especialistaUid = su UID.
//
// Paciente:
//   citas donde pacienteUid = su UID.
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
// ----------------------------------------------------------

const crearCita = async (req, res) => {
  try {
    const uid = req.user.uid
    const profesional = await obtenerUsuarioActual(uid)

    if (!esProfesionalSalud(profesional)) {
      return res.status(403).json({
        success: false,
        message:
          'Solo un profesional de salud puede crear citas.',
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
        message:
          'Paciente, fecha y hora son obligatorios.',
      })
    }

    const paciente =
      await obtenerUsuarioActual(pacienteUid)

    if (!paciente) {
      return res.status(404).json({
        success: false,
        message:
          'No se encontró el paciente seleccionado.',
      })
    }

    // ------------------------------------------------------
    // VALIDAR VÍNCULO PROFESIONAL-PACIENTE
    // ------------------------------------------------------

    const vinculosSnapshot = await db
      .collection('seguimiento_profesional')
      .where('profesionalUid', '==', uid)
      .get()

    const vinculoActivo =
      vinculosSnapshot.docs.some((doc) => {
        const vinculo = doc.data()

        return (
          vinculo.pacienteUid === pacienteUid &&
          vinculo.estado === 'activo'
        )
      })

    if (!vinculoActivo) {
      return res.status(403).json({
        success: false,
        message:
          'El paciente seleccionado no está vinculado activamente a este profesional.',
      })
    }

    const citaRef =
      db.collection('citas').doc()

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

      especialidad:
        profesional.especialidad || '',

      fecha,
      hora,

      zonaHoraria:
        'America/Cancun',

      motivo:
        String(motivo).trim(),

      lugar:
        String(lugar).trim(),

      modalidad,

      notas:
        String(notas).trim(),

      estado:
        'pendiente',

      recordatorioActivo:
        Boolean(recordatorioActivo),

      creadoPor:
        uid,

      creadoEn:
        FieldValue.serverTimestamp(),

      actualizadoEn:
        FieldValue.serverTimestamp(),
    }

    await citaRef.set(nuevaCita)

    const creada =
      await citaRef.get()

    return res.status(201).json({
      success: true,

      cita: {
        id: creada.id,
        ...creada.data(),
      },
    })
  } catch (error) {
    console.error('Error al crear cita:', error)

    return res.status(500).json({
      success: false,
      message:
        'No fue posible crear la cita.',
    })
  }
}


// ----------------------------------------------------------
// ACTUALIZAR CITA
// ----------------------------------------------------------
// PROFESIONAL:
// puede editar los datos de una cita que le pertenece.
//
// PACIENTE:
// solo puede realizar estas acciones sobre SU cita:
// - confirmar
// - solicitar reagenda
// - cancelar
//
// El paciente NO puede cambiar:
// - fecha
// - hora
// - especialista
// - paciente
// - lugar
// - modalidad
// - notas
// ----------------------------------------------------------

const actualizarCita = async (req, res) => {
  try {
    const uid = req.user.uid
    const usuario =
      await obtenerUsuarioActual(uid)

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message:
          'No se encontró el perfil del usuario.',
      })
    }

    const citaRef =
      db.collection('citas').doc(
        req.params.id
      )

    const snapshot =
      await citaRef.get()

    if (!snapshot.exists) {
      return res.status(404).json({
        success: false,
        message:
          'La cita no existe.',
      })
    }

    const citaActual =
      snapshot.data()


    // ======================================================
    // ACTUALIZACIÓN COMO PROFESIONAL
    // ======================================================

    if (esProfesionalSalud(usuario)) {

      if (
        citaActual.especialistaUid !== uid
      ) {
        return res.status(403).json({
          success: false,
          message:
            'No puedes modificar una cita de otro profesional.',
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
        if (
          Object.prototype
            .hasOwnProperty
            .call(
              req.body || {},
              campo
            )
        ) {
          cambios[campo] =
            req.body[campo]
        }
      })


      // ----------------------------------------------------
      // SI EL PACIENTE PIDIÓ REAGENDA Y EL PROFESIONAL
      // CAMBIA FECHA U HORA, LA CITA VUELVE A "PENDIENTE"
      // PARA QUE EL PACIENTE CONFIRME LA NUEVA FECHA.
      // ----------------------------------------------------

      const cambioFecha =
        Object.prototype
          .hasOwnProperty
          .call(
            req.body || {},
            'fecha'
          )

      const cambioHora =
        Object.prototype
          .hasOwnProperty
          .call(
            req.body || {},
            'hora'
          )

      if (
        citaActual.estado ===
          'reagenda_solicitada' &&
        (cambioFecha || cambioHora)
      ) {
        cambios.estado =
          'pendiente'

        cambios.reagendadoPor =
          uid

        cambios.fechaReagendaProfesional =
          FieldValue.serverTimestamp()
      }


      cambios.actualizadoEn =
        FieldValue.serverTimestamp()


      await citaRef.update(
        cambios
      )
    }


    // ======================================================
    // ACTUALIZACIÓN COMO PACIENTE
    // ======================================================

    else if (esPaciente(usuario)) {

      // El paciente solo puede actuar sobre su propia cita.
      if (
        citaActual.pacienteUid !== uid
      ) {
        return res.status(403).json({
          success: false,
          message:
            'No puedes modificar una cita que no te pertenece.',
        })
      }


      const estadoSolicitado =
        req.body?.estado


      // ----------------------------------------------------
      // CONFIRMAR
      // ----------------------------------------------------

      if (
        estadoSolicitado ===
        'confirmada'
      ) {

        if (
          !tieneAutenticacionReciente(
            req.user
          )
        ) {
          return res.status(401).json({
            success: false,
            message:
              'Por seguridad, confirma nuevamente tu contraseña antes de confirmar la cita.',
          })
        }

        if (
          citaActual.estado !==
          'pendiente'
        ) {
          return res.status(400).json({
            success: false,
            message:
              'Esta cita ya no puede confirmarse.',
          })
        }

        await citaRef.update({
          estado:
            'confirmada',

          fechaConfirmacionPaciente:
            FieldValue.serverTimestamp(),

          confirmadoPorPaciente:
            uid,

          metodoConfirmacion:
            'contrasena',

          actualizadoEn:
            FieldValue.serverTimestamp(),
        })
      }


      // ----------------------------------------------------
      // SOLICITAR REAGENDA
      // ----------------------------------------------------

      else if (
        estadoSolicitado ===
        'reagenda_solicitada'
      ) {

        if (
          citaActual.estado ===
            'cancelada' ||
          citaActual.estado ===
            'completada' ||
          citaActual.estado ===
            'reagenda_solicitada'
        ) {
          return res.status(400).json({
            success: false,
            message:
              'Esta cita no admite una solicitud de reagenda.',
          })
        }


        const motivoReagenda =
          String(
            req.body?.motivoReagenda ||
            ''
          ).trim()


        if (
          motivoReagenda.length < 5
        ) {
          return res.status(400).json({
            success: false,
            message:
              'Escribe brevemente el motivo de la reagenda.',
          })
        }


        await citaRef.update({
          estado:
            'reagenda_solicitada',

          motivoReagenda,

          fechaSolicitudReagenda:
            FieldValue.serverTimestamp(),

          actualizadoEn:
            FieldValue.serverTimestamp(),
        })
      }


      // ----------------------------------------------------
      // CANCELAR
      // ----------------------------------------------------

      else if (
        estadoSolicitado ===
        'cancelada'
      ) {

        if (
          citaActual.estado ===
            'cancelada' ||
          citaActual.estado ===
            'completada'
        ) {
          return res.status(400).json({
            success: false,
            message:
              'Esta cita ya no puede cancelarse.',
          })
        }


        const motivoCancelacion =
          String(
            req.body?.motivoCancelacion ||
            ''
          ).trim()


        await citaRef.update({
          estado:
            'cancelada',

          motivoCancelacion,

          fechaCancelacion:
            FieldValue.serverTimestamp(),

          canceladaPor:
            uid,

          actualizadoEn:
            FieldValue.serverTimestamp(),
        })
      }


      // ----------------------------------------------------
      // CUALQUIER OTRO CAMBIO ESTÁ PROHIBIDO
      // ----------------------------------------------------

      else {
        return res.status(403).json({
          success: false,
          message:
            'El paciente solo puede confirmar, solicitar reagenda o cancelar su cita.',
        })
      }
    }


    // ======================================================
    // ROL NO PERMITIDO
    // ======================================================

    else {
      return res.status(403).json({
        success: false,
        message:
          'No tienes permiso para modificar citas.',
      })
    }


    const actualizada =
      await citaRef.get()


    return res.json({
      success: true,

      cita: {
        id: actualizada.id,
        ...actualizada.data(),
      },
    })

  } catch (error) {

    console.error(
      'Error al actualizar cita:',
      error
    )

    return res.status(500).json({
      success: false,
      message:
        'No fue posible actualizar la cita.',
    })
  }
}


// ----------------------------------------------------------
// CONFIRMAR CITA (PACIENTE)
// ----------------------------------------------------------
// El paciente NO edita la cita.
// Solamente confirma su asistencia.
// ----------------------------------------------------------

const confirmarCitaPaciente = async (req, res) => {
  try {
    const uid = req.user.uid
    const usuario = await obtenerUsuarioActual(uid)

    if (!usuario || !esPaciente(usuario)) {
      return res.status(403).json({
        success: false,
        message:
          'Solo el paciente puede confirmar esta cita.',
      })
    }

    // La interfaz reautentica al paciente con su contraseña
    // antes de llamar este endpoint.
    //
    // Aquí comprobamos que el token de Firebase realmente
    // corresponda a una autenticación reciente.
    if (
      !tieneAutenticacionReciente(
        req.user
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          'Por seguridad, confirma nuevamente tu contraseña antes de confirmar la cita.',
      })
    }

    const citaRef =
      db.collection('citas').doc(req.params.id)

    const snapshot =
      await citaRef.get()

    if (!snapshot.exists) {
      return res.status(404).json({
        success: false,
        message:
          'La cita no existe.',
      })
    }

    const citaActual =
      snapshot.data()

    if (citaActual.pacienteUid !== uid) {
      return res.status(403).json({
        success: false,
        message:
          'No puedes confirmar una cita que no te pertenece.',
      })
    }

    if (citaActual.estado !== 'pendiente') {
      return res.status(400).json({
        success: false,
        message:
          'Esta cita ya no puede confirmarse.',
      })
    }

    await citaRef.update({
      estado:
        'confirmada',

      fechaConfirmacionPaciente:
        FieldValue.serverTimestamp(),

      confirmadoPorPaciente:
        uid,

      metodoConfirmacion:
        'contrasena',

      actualizadoEn:
        FieldValue.serverTimestamp(),
    })

    await crearNotificacionProfesional({
      profesionalUid:
        citaActual.especialistaUid,

      pacienteUid:
        uid,

      citaId:
        citaRef.id,

      tipo:
        'cita_confirmada',

      titulo:
        'Cita confirmada',

      mensaje:
        `${citaActual.nombrePaciente || 'El paciente'} confirmó su cita del ${citaActual.fecha || ''} a las ${citaActual.hora || ''}.`,
    })

    const actualizada =
      await citaRef.get()

    return res.json({
      success: true,
      message:
        'Cita confirmada correctamente.',
      cita: {
        id: actualizada.id,
        ...actualizada.data(),
      },
    })
  } catch (error) {
    console.error(
      'Error al confirmar cita:',
      error
    )

    return res.status(500).json({
      success: false,
      message:
        'No fue posible confirmar la cita.',
    })
  }
}


// ----------------------------------------------------------
// CANCELAR CITA (PACIENTE)
// ----------------------------------------------------------
// El paciente NO elimina la cita.
// Solo registra que ya no podrá asistir.
// ----------------------------------------------------------

const cancelarCitaPaciente = async (req, res) => {
  try {
    const uid = req.user.uid
    const usuario = await obtenerUsuarioActual(uid)

    if (!usuario || !esPaciente(usuario)) {
      return res.status(403).json({
        success: false,
        message:
          'Solo el paciente puede cancelar esta cita.',
      })
    }

    const citaRef =
      db.collection('citas').doc(req.params.id)

    const snapshot =
      await citaRef.get()

    if (!snapshot.exists) {
      return res.status(404).json({
        success: false,
        message:
          'La cita no existe.',
      })
    }

    const citaActual =
      snapshot.data()

    if (citaActual.pacienteUid !== uid) {
      return res.status(403).json({
        success: false,
        message:
          'No puedes cancelar una cita que no te pertenece.',
      })
    }

    if (
      citaActual.estado === 'cancelada' ||
      citaActual.estado === 'completada'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Esta cita ya no puede cancelarse.',
      })
    }

    const motivoCancelacion =
      String(
        req.body?.motivoCancelacion || ''
      ).trim()

    await citaRef.update({
      estado:
        'cancelada',

      motivoCancelacion,

      fechaCancelacion:
        FieldValue.serverTimestamp(),

      canceladaPorPaciente:
        uid,

      actualizadoEn:
        FieldValue.serverTimestamp(),
    })

    await crearNotificacionProfesional({
      profesionalUid:
        citaActual.especialistaUid,

      pacienteUid:
        uid,

      citaId:
        citaRef.id,

      tipo:
        'cita_cancelada',

      titulo:
        'Cita cancelada',

      mensaje:
        `${citaActual.nombrePaciente || 'El paciente'} canceló su cita del ${citaActual.fecha || ''} a las ${citaActual.hora || ''}.`,

      detalle:
        motivoCancelacion
          ? `Motivo: ${motivoCancelacion}`
          : 'El paciente no indicó un motivo.',
    })

    const actualizada =
      await citaRef.get()

    return res.json({
      success: true,
      message:
        'Cita cancelada correctamente.',
      cita: {
        id: actualizada.id,
        ...actualizada.data(),
      },
    })
  } catch (error) {
    console.error(
      'Error al cancelar cita:',
      error
    )

    return res.status(500).json({
      success: false,
      message:
        'No fue posible cancelar la cita.',
    })
  }
}


// ----------------------------------------------------------
// SOLICITAR REAGENDA (PACIENTE)
// ----------------------------------------------------------
// Esta acción NO modifica la fecha ni la hora de la cita.
// Solamente registra una solicitud para que el profesional
// decida si puede cambiarla.
// ----------------------------------------------------------

const solicitarReagendaPaciente = async (req, res) => {
  try {
    const uid = req.user.uid
    const usuario = await obtenerUsuarioActual(uid)

    if (!usuario || !esPaciente(usuario)) {
      return res.status(403).json({
        success: false,
        message:
          'Solo el paciente puede enviar esta solicitud.',
      })
    }

    const citaRef =
      db.collection('citas').doc(req.params.id)

    const snapshot =
      await citaRef.get()

    if (!snapshot.exists) {
      return res.status(404).json({
        success: false,
        message:
          'La cita no existe.',
      })
    }

    const citaActual =
      snapshot.data()

    if (citaActual.pacienteUid !== uid) {
      return res.status(403).json({
        success: false,
        message:
          'No puedes solicitar cambios sobre una cita que no te pertenece.',
      })
    }

    if (
      citaActual.estado === 'cancelada' ||
      citaActual.estado === 'completada'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Esta cita ya no admite una solicitud de reagenda.',
      })
    }

    const motivoReagenda =
      String(
        req.body?.motivoReagenda || ''
      ).trim()

    const fechaSolicitadaPaciente =
      String(
        req.body?.fechaSolicitada || ''
      ).trim()

    const horaSolicitadaPaciente =
      String(
        req.body?.horaSolicitada || ''
      ).trim()

    if (motivoReagenda.length < 5) {
      return res.status(400).json({
        success: false,
        message:
          'Escribe brevemente el motivo de la solicitud.',
      })
    }

    const cambiosReagenda = {
      // La fecha y la hora actuales NO cambian todavía.
      estado:
        'reagenda_solicitada',

      motivoReagenda,

      fechaSolicitadaPaciente,
      horaSolicitadaPaciente,

      solicitadoPorPaciente:
        uid,

      actualizadoEn:
        FieldValue.serverTimestamp(),
    }

    // Si es la primera solicitud, guardamos cuándo se creó.
    // Si ya existía, conservamos esa fecha y registramos
    // únicamente cuándo se actualizó el motivo.
    if (
      citaActual.estado ===
      'reagenda_solicitada'
    ) {
      cambiosReagenda.fechaUltimaActualizacionReagenda =
        FieldValue.serverTimestamp()
    } else {
      cambiosReagenda.fechaSolicitudReagenda =
        FieldValue.serverTimestamp()
    }

    await citaRef.update(
      cambiosReagenda
    )

    await crearNotificacionProfesional({
      profesionalUid:
        citaActual.especialistaUid,

      pacienteUid:
        uid,

      citaId:
        citaRef.id,

      tipo:
        'reagenda_solicitada',

      titulo:
        'Solicitud de reagenda',

      mensaje:
        `${citaActual.nombrePaciente || 'El paciente'} solicitó reagendar su cita.`,

      detalle:
        [
          `Motivo: ${motivoReagenda}`,
          fechaSolicitadaPaciente
            ? `Fecha sugerida: ${fechaSolicitadaPaciente}`
            : '',
          horaSolicitadaPaciente
            ? `Hora sugerida: ${horaSolicitadaPaciente}`
            : '',
        ]
          .filter(Boolean)
          .join(' · '),
    })

    const actualizada =
      await citaRef.get()

    return res.json({
      success: true,
      message:
        citaActual.estado === 'reagenda_solicitada'
          ? 'Solicitud de reagenda actualizada correctamente.'
          : 'Solicitud de reagenda enviada al profesional.',
      cita: {
        id: actualizada.id,
        ...actualizada.data(),
      },
    })
  } catch (error) {
    console.error(
      'Error al solicitar reagenda:',
      error
    )

    return res.status(500).json({
      success: false,
      message:
        'No fue posible enviar la solicitud de reagenda.',
    })
  }
}


// ----------------------------------------------------------
// REAGENDAR CITA (PROFESIONAL)
// ----------------------------------------------------------
// Esta ruta es exclusiva del profesional.
//
// El profesional propone una nueva fecha y/o hora.
// La cita vuelve a estado "pendiente" para que el paciente
// confirme la nueva propuesta.
// ----------------------------------------------------------

const reagendarCitaProfesional = async (req, res) => {
  try {
    const uid = req.user.uid
    const profesional =
      await obtenerUsuarioActual(uid)

    if (!esProfesionalSalud(profesional)) {
      return res.status(403).json({
        success: false,
        message:
          'Solo un profesional de salud puede reagendar citas.',
      })
    }

    const citaRef =
      db.collection('citas').doc(
        req.params.id
      )

    const snapshot =
      await citaRef.get()

    if (!snapshot.exists) {
      return res.status(404).json({
        success: false,
        message:
          'La cita no existe.',
      })
    }

    const citaActual =
      snapshot.data()

    if (
      citaActual.especialistaUid !==
      uid
    ) {
      return res.status(403).json({
        success: false,
        message:
          'No puedes reagendar una cita de otro profesional.',
      })
    }

    if (
      citaActual.estado === 'cancelada' ||
      citaActual.estado === 'completada'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Esta cita ya no puede reagendarse.',
      })
    }

    const {
      fecha,
      hora,
      motivo,
      lugar,
      modalidad,
      notas,
      recordatorioActivo,
    } = req.body || {}

    if (!fecha || !hora) {
      return res.status(400).json({
        success: false,
        message:
          'La nueva fecha y hora son obligatorias.',
      })
    }

    const fechaNueva =
      String(fecha).trim()

    const horaNueva =
      String(hora).trim()

    if (
      fechaNueva === citaActual.fecha &&
      horaNueva === citaActual.hora
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Selecciona una fecha o una hora diferente para reagendar.',
      })
    }

    const cambios = {
      // Guardamos la cita anterior para referencia.
      fechaAnterior:
        citaActual.fecha || null,

      horaAnterior:
        citaActual.hora || null,

      fecha:
        fechaNueva,

      hora:
        horaNueva,

      // El paciente debe confirmar la nueva propuesta.
      estado:
        'pendiente',

      reagendadoPor:
        uid,

      fechaReagendaProfesional:
        FieldValue.serverTimestamp(),

      requiereConfirmacionPaciente:
        true,

      actualizadoEn:
        FieldValue.serverTimestamp(),
    }

    if (motivo !== undefined) {
      cambios.motivo =
        String(motivo).trim()
    }

    if (lugar !== undefined) {
      cambios.lugar =
        String(lugar).trim()
    }

    if (modalidad !== undefined) {
      cambios.modalidad =
        modalidad
    }

    if (notas !== undefined) {
      cambios.notas =
        String(notas).trim()
    }

    if (
      recordatorioActivo !==
      undefined
    ) {
      cambios.recordatorioActivo =
        Boolean(recordatorioActivo)
    }

    await citaRef.update(
      cambios
    )

    const actualizada =
      await citaRef.get()

    return res.json({
      success: true,
      message:
        'Cita reagendada. El paciente debe confirmar la nueva fecha.',
      cita: {
        id: actualizada.id,
        ...actualizada.data(),
      },
    })

  } catch (error) {

    console.error(
      'Error al reagendar cita:',
      error
    )

    return res.status(500).json({
      success: false,
      message:
        'No fue posible reagendar la cita.',
    })
  }
}


// ----------------------------------------------------------
// ELIMINAR CITA
// ----------------------------------------------------------
// Solo el profesional propietario puede eliminar físicamente
// la cita.
//
// El paciente NO usa DELETE: su acción "Cancelar" cambia
// el estado a "cancelada" para conservar el historial.
// ----------------------------------------------------------

const eliminarCita = async (req, res) => {
  try {
    const uid = req.user.uid
    const profesional =
      await obtenerUsuarioActual(uid)

    if (
      !esProfesionalSalud(
        profesional
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          'No tienes permiso para eliminar citas.',
      })
    }

    const citaRef =
      db.collection('citas').doc(
        req.params.id
      )

    const snapshot =
      await citaRef.get()

    if (!snapshot.exists) {
      return res.status(404).json({
        success: false,
        message:
          'La cita no existe.',
      })
    }

    if (
      snapshot.data().especialistaUid !== uid
    ) {
      return res.status(403).json({
        success: false,
        message:
          'No puedes eliminar una cita de otro profesional.',
      })
    }

    await citaRef.delete()

    return res.json({
      success: true,
      message:
        'Cita eliminada correctamente.',
    })

  } catch (error) {

    console.error(
      'Error al eliminar cita:',
      error
    )

    return res.status(500).json({
      success: false,
      message:
        'No fue posible eliminar la cita.',
    })
  }
}


module.exports = {
  obtenerMisCitas,
  crearCita,
  actualizarCita,
  confirmarCitaPaciente,
  solicitarReagendaPaciente,
  cancelarCitaPaciente,
  reagendarCitaProfesional,
  eliminarCita,
}