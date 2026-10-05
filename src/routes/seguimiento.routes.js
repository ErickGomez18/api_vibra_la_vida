// ==========================================================
// RUTAS DE SEGUIMIENTO PROFESIONAL
// ==========================================================

const express = require('express')

const {
  obtenerMisVinculos,
  crearSolicitudSeguimiento,
  obtenerCodigoSeguimiento,
  autorizarSeguimiento,
  rechazarSeguimiento,
} = require('../controllers/seguimiento.controller')

const {
  verifyFirebaseToken,
} = require('../middlewares/auth.middleware')

const router = express.Router()

router.use(
  verifyFirebaseToken
)

// Paciente: consulta solicitudes pendientes y profesionales activos.
router.get(
  '/mis-vinculos',
  obtenerMisVinculos
)

// Doctor: crea únicamente una solicitud pendiente.
router.post(
  '/solicitudes',
  crearSolicitudSeguimiento
)

// Paciente: recibe el código dentro de Vibra la Vida.
router.post(
  '/:id/codigo',
  obtenerCodigoSeguimiento
)

// Paciente: valida el OTP y activa el vínculo.
router.post(
  '/:id/autorizar',
  autorizarSeguimiento
)

// Paciente: rechaza la solicitud.
router.post(
  '/:id/rechazar',
  rechazarSeguimiento
)

module.exports = router
