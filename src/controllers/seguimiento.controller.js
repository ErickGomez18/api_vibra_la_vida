// ==========================================================
// SEGUIMIENTO PROFESIONAL - OTP EN VIBRA LA VIDA
// ==========================================================

const crypto = require('crypto')

const {
  db,
  FieldValue,
} = require('../config/firebase')


const OTP_DURACION_MINUTOS = 10
const OTP_MAX_INTENTOS = 5


const crearError = (
  status,
  message
) => {
  const error = new Error(message)
  error.status = status
  return error
}


const obtenerSecretOtp = () => {
  const secreto =
    process.env.OTP_SEGUIMIENTO_SECRET

  if (!secreto || secreto.length < 24) {
    throw crearError(
      500,
      'Falta configurar OTP_SEGUIMIENTO_SECRET en la API.'
    )
  }

  return secreto
}


const obtenerMillis = (
  valor
) => {
  if (!valor) {
    return 0
  }

  if (typeof valor.toMillis === 'function') {
    return valor.toMillis()
  }

  if (valor instanceof Date) {
    return valor.getTime()
  }

  return new Date(valor).getTime()
}


// El OTP se deriva con HMAC.
// No necesitamos guardar el código en texto plano en Firestore.
const generarCodigoOtp = ({
  seguimientoId,
  version,
  expiraEnMillis,
}) => {
  const secreto = obtenerSecretOtp()

  const firma = crypto
    .createHmac('sha256', secreto)
    .update(
      `${seguimientoId}:${version}:${expiraEnMillis}`
    )
    .digest()

  const numero =
    firma.readUInt32BE(0) % 1000000

  return String(numero).padStart(6, '0')
}


const asegurarProfesional = async (
  uid
) => {
  const documento =
    await db
      .collection('usuarios')
      .doc(uid)
      .get()

  if (!documento.exists) {
    throw crearError(
      403,
      'No se encontró tu perfil de usuario.'
    )
  }

  const rol = documento.data()?.rol

  if (
    rol !== 'profesional_salud' &&
    rol !== 'doctor'
  ) {
    throw crearError(
      403,
      'Solo un profesional de la salud puede enviar solicitudes.'
    )
  }
}


// ==========================================================
// PACIENTE: CONSULTAR SUS SOLICITUDES Y EQUIPO
// ==========================================================
//
// Este endpoint permite que WEB y ANDROID lean la misma información
// desde Express.
//
// Solo se consultan vínculos cuyo pacienteUid coincide con el token.
// ==========================================================

const obtenerPerfilPublicoProfesional = async (
  profesionalUid,
  datosVinculo,
  vinculoId
) => {
  const perfilRef =
    db
      .collection('perfiles_profesionales')
      .doc(profesionalUid)

  const usuarioRef =
    db
      .collection('usuarios')
      .doc(profesionalUid)

  const [
    perfilDoc,
    usuarioDoc,
  ] = await Promise.all([
    perfilRef.get(),
    usuarioRef.get(),
  ])

  const perfil =
    perfilDoc.exists
      ? perfilDoc.data()
      : {}

  const usuario =
    usuarioDoc.exists
      ? usuarioDoc.data()
      : {}

  const consultorio =
    perfil.consultorio &&
    typeof perfil.consultorio === 'object'
      ? perfil.consultorio
      : null

  return {
    uid:
      profesionalUid,

    vinculoId,

    estado:
      datosVinculo.estado || null,

    fechaSolicitud:
      datosVinculo.fechaSolicitud?.toDate
        ? datosVinculo.fechaSolicitud.toDate().toISOString()
        : null,

    fechaVinculacion:
      datosVinculo.fechaVinculacion?.toDate
        ? datosVinculo.fechaVinculacion.toDate().toISOString()
        : null,

    nombreCompleto:
      perfil.nombreCompleto ||
      usuario.nombreCompleto ||
      usuario.nombre ||
      'Profesional de salud',

    profesionRegistrada:
      perfil.profesionRegistrada ||
      perfil.profesion ||
      null,

    especialidad:
      perfil.especialidad ||
      null,

    cedulaProfesional:
      perfil.cedulaProfesional ||
      perfil.cedula ||
      null,

    cedulaVerificada:
      Boolean(
        perfil.cedulaVerificada
      ),

// ----------------------------------------------------------
// FORMACIÓN ADICIONAL
// ----------------------------------------------------------
//
// En Firestore puede estar guardada como:
//
// ["Curso 1", "Curso 2"]
//
// o como:
//
// "Curso 1"
//
// Para que Web y Android reciban siempre el mismo tipo,
// convertimos cualquier arreglo en un solo texto.
// ----------------------------------------------------------

formacionAdicional:
  Array.isArray(
    perfil.formacionAdicional
  )
    ? perfil.formacionAdicional.join(
        ", "
      )
    : (
        typeof perfil.formacionAdicional ===
        "string"
          ? perfil.formacionAdicional
          : null
      ),

    tieneConsultorio:
      Boolean(
        perfil.tieneConsultorio
      ),

    consultorio:
      consultorio
        ? {
            nombre:
              consultorio.nombre || null,

            direccion:
              consultorio.direccion ||
              consultorio.ubicacion ||
              null,

            telefono:
              consultorio.telefono || null,

            horario:
              consultorio.horario || null,
          }
        : null,
  }
}


const obtenerMisVinculos = async (
  req,
  res
) => {
  try {
    const pacienteUid =
      req.user.uid

    const snapshot =
      await db
        .collection('seguimiento_profesional')
        .where(
          'pacienteUid',
          '==',
          pacienteUid
        )
        .get()

    const solicitudesPendientes = []
    const equipoSalud = []

    for (
      const documento of snapshot.docs
    ) {
      const datos =
        documento.data()

      if (
        datos.estado !== 'pendiente' &&
        datos.estado !== 'activo'
      ) {
        continue
      }

      const profesional =
        await obtenerPerfilPublicoProfesional(
          datos.profesionalUid,
          datos,
          documento.id
        )

      if (
        datos.estado === 'pendiente'
      ) {
        solicitudesPendientes.push(
          profesional
        )
      }

      if (
        datos.estado === 'activo'
      ) {
        equipoSalud.push(
          profesional
        )
      }
    }

    return res.json({
      success: true,
      solicitudesPendientes,
      equipoSalud,
    })

  } catch (error) {
    console.error(
      'Error consultando vínculos del paciente:',
      error
    )

    return res
      .status(500)
      .json({
        success: false,
        message:
          'No fue posible consultar tu equipo de salud.',
      })
  }
}


// ==========================================================
// DOCTOR: ENVIAR SOLICITUD
// ==========================================================

const crearSolicitudSeguimiento = async (
  req,
  res
) => {
  try {
    const profesionalUid = req.user.uid
    const pacienteUid =
      String(req.body?.pacienteUid || '').trim()

    if (!pacienteUid) {
      throw crearError(
        400,
        'Falta seleccionar al paciente.'
      )
    }

    if (pacienteUid === profesionalUid) {
      throw crearError(
        400,
        'No puedes solicitar seguimiento a tu propia cuenta.'
      )
    }

    await asegurarProfesional(
      profesionalUid
    )

    const pacienteDoc =
      await db
        .collection('directorio_pacientes')
        .doc(pacienteUid)
        .get()

    if (!pacienteDoc.exists) {
      throw crearError(
        404,
        'No se encontró al paciente en el directorio.'
      )
    }

    const seguimientoId =
      `${profesionalUid}_${pacienteUid}`

    const referencia =
      db
        .collection('seguimiento_profesional')
        .doc(seguimientoId)

    const ahora = Date.now()
    const expiraEnMillis =
      ahora + OTP_DURACION_MINUTOS * 60 * 1000

    await db.runTransaction(
      async (transaccion) => {
        const existente =
          await transaccion.get(
            referencia
          )

        const datosAnteriores =
          existente.exists
            ? existente.data()
            : null

        if (
          datosAnteriores?.estado === 'activo'
        ) {
          throw crearError(
            409,
            'Este paciente ya autorizó tu seguimiento.'
          )
        }

        const versionAnterior =
          Number(
            datosAnteriores?.otpVersion || 0
          )

        transaccion.set(
          referencia,
          {
            profesionalUid,
            pacienteUid,
            estado: 'pendiente',
            fechaSolicitud:
              FieldValue.serverTimestamp(),
            fechaVinculacion: null,
            verificadoEn: null,
            metodoVerificacion: null,
            otpVersion:
              versionAnterior + 1,
            otpExpiraEn:
              new Date(expiraEnMillis),
            otpIntentos: 0,
          },
          {
            merge: true,
          }
        )
      }
    )

    return res.status(201).json({
      success: true,
      seguimientoId,
      estado: 'pendiente',
      message:
        'Solicitud enviada. El paciente debe autorizarla con su código de un solo uso.',
    })

  } catch (error) {
    console.error(
      'Error creando solicitud de seguimiento:',
      error
    )

    return res
      .status(error.status || 500)
      .json({
        success: false,
        message:
          error.message ||
          'No fue posible crear la solicitud.',
      })
  }
}


// ==========================================================
// PACIENTE: RECIBIR OTP DENTRO DE LA APP/WEB
// ==========================================================

const obtenerCodigoSeguimiento = async (
  req,
  res
) => {
  try {
    const pacienteUid = req.user.uid
    const seguimientoId = req.params.id

    const referencia =
      db
        .collection('seguimiento_profesional')
        .doc(seguimientoId)

    let version
    let expiraEnMillis

    await db.runTransaction(
      async (transaccion) => {
        const documento =
          await transaccion.get(
            referencia
          )

        if (!documento.exists) {
          throw crearError(
            404,
            'No se encontró la solicitud.'
          )
        }

        const datos = documento.data()

        if (
          datos.pacienteUid !== pacienteUid
        ) {
          throw crearError(
            403,
            'Esta solicitud no pertenece a tu cuenta.'
          )
        }

        if (datos.estado !== 'pendiente') {
          throw crearError(
            409,
            'Esta solicitud ya no está pendiente.'
          )
        }

        version = Number(
          datos.otpVersion || 1
        )

        expiraEnMillis =
          obtenerMillis(
            datos.otpExpiraEn
          )

        // Si ya expiró, generamos una versión nueva.
        // Así el paciente no depende del doctor para renovarlo.
        if (
          !expiraEnMillis ||
          Date.now() >= expiraEnMillis
        ) {
          version += 1
          expiraEnMillis =
            Date.now() +
            OTP_DURACION_MINUTOS * 60 * 1000

          transaccion.update(
            referencia,
            {
              otpVersion: version,
              otpExpiraEn:
                new Date(expiraEnMillis),
              otpIntentos: 0,
            }
          )
        }
      }
    )

    const codigo = generarCodigoOtp({
      seguimientoId,
      version,
      expiraEnMillis,
    })

    return res.json({
      success: true,
      codigo,
      expiraEn:
        new Date(expiraEnMillis).toISOString(),
      minutosValidez:
        OTP_DURACION_MINUTOS,
    })

  } catch (error) {
    console.error(
      'Error entregando código OTP:',
      error
    )

    return res
      .status(error.status || 500)
      .json({
        success: false,
        message:
          error.message ||
          'No fue posible obtener el código.',
      })
  }
}


// ==========================================================
// PACIENTE: VERIFICAR OTP Y AUTORIZAR
// ==========================================================

const autorizarSeguimiento = async (
  req,
  res
) => {
  try {
    const pacienteUid = req.user.uid
    const seguimientoId = req.params.id
    const codigoRecibido =
      String(req.body?.codigo || '')
        .replace(/\D/g, '')

    if (codigoRecibido.length !== 6) {
      throw crearError(
        400,
        'El código debe contener 6 dígitos.'
      )
    }

    const referencia =
      db
        .collection('seguimiento_profesional')
        .doc(seguimientoId)

    await db.runTransaction(
      async (transaccion) => {
        const documento =
          await transaccion.get(
            referencia
          )

        if (!documento.exists) {
          throw crearError(
            404,
            'No se encontró la solicitud.'
          )
        }

        const datos = documento.data()

        if (
          datos.pacienteUid !== pacienteUid
        ) {
          throw crearError(
            403,
            'Esta solicitud no pertenece a tu cuenta.'
          )
        }

        if (datos.estado !== 'pendiente') {
          throw crearError(
            409,
            'Esta solicitud ya no está pendiente.'
          )
        }

        const intentos = Number(
          datos.otpIntentos || 0
        )

        if (intentos >= OTP_MAX_INTENTOS) {
          throw crearError(
            429,
            'Se alcanzó el límite de intentos. Solicita un código nuevo.'
          )
        }

        const expiraEnMillis =
          obtenerMillis(
            datos.otpExpiraEn
          )

        if (
          !expiraEnMillis ||
          Date.now() >= expiraEnMillis
        ) {
          throw crearError(
            410,
            'El código expiró. Solicita uno nuevo.'
          )
        }

        const codigoEsperado =
          generarCodigoOtp({
            seguimientoId,
            version:
              Number(datos.otpVersion || 1),
            expiraEnMillis,
          })

        const coincide =
          crypto.timingSafeEqual(
            Buffer.from(codigoRecibido),
            Buffer.from(codigoEsperado)
          )

        if (!coincide) {
          transaccion.update(
            referencia,
            {
              otpIntentos:
                intentos + 1,
            }
          )

          throw crearError(
            401,
            'El código es incorrecto.'
          )
        }

        transaccion.update(
          referencia,
          {
            estado: 'activo',
            fechaVinculacion:
              FieldValue.serverTimestamp(),
            verificadoEn:
              FieldValue.serverTimestamp(),
            metodoVerificacion:
              'otp_app',
            otpVersion: null,
            otpExpiraEn: null,
            otpIntentos: null,
          }
        )
      }
    )

    return res.json({
      success: true,
      estado: 'activo',
      message:
        'Seguimiento autorizado correctamente.',
    })

  } catch (error) {
    console.error(
      'Error autorizando seguimiento:',
      error
    )

    return res
      .status(error.status || 500)
      .json({
        success: false,
        message:
          error.message ||
          'No fue posible autorizar el seguimiento.',
      })
  }
}


// ==========================================================
// PACIENTE: RECHAZAR
// ==========================================================

const rechazarSeguimiento = async (
  req,
  res
) => {
  try {
    const pacienteUid = req.user.uid
    const seguimientoId = req.params.id

    const referencia =
      db
        .collection('seguimiento_profesional')
        .doc(seguimientoId)

    await db.runTransaction(
      async (transaccion) => {
        const documento =
          await transaccion.get(
            referencia
          )

        if (!documento.exists) {
          throw crearError(
            404,
            'No se encontró la solicitud.'
          )
        }

        const datos = documento.data()

        if (
          datos.pacienteUid !== pacienteUid
        ) {
          throw crearError(
            403,
            'Esta solicitud no pertenece a tu cuenta.'
          )
        }

        if (datos.estado !== 'pendiente') {
          throw crearError(
            409,
            'Esta solicitud ya no está pendiente.'
          )
        }

        transaccion.update(
          referencia,
          {
            estado: 'rechazado',
            fechaRechazo:
              FieldValue.serverTimestamp(),
            otpVersion: null,
            otpExpiraEn: null,
            otpIntentos: null,
          }
        )
      }
    )

    return res.json({
      success: true,
      estado: 'rechazado',
      message: 'Solicitud rechazada.',
    })

  } catch (error) {
    console.error(
      'Error rechazando seguimiento:',
      error
    )

    return res
      .status(error.status || 500)
      .json({
        success: false,
        message:
          error.message ||
          'No fue posible rechazar la solicitud.',
      })
  }
}


module.exports = {
  obtenerMisVinculos,
  crearSolicitudSeguimiento,
  obtenerCodigoSeguimiento,
  autorizarSeguimiento,
  rechazarSeguimiento,
}
