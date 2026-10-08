const express =
  require('express')

const {
  obtenerNotificacionesProfesional,
  marcarNotificacionLeida,
  marcarTodasLeidas,
} = require(
  '../controllers/notificaciones.controller'
)

const {
  verifyFirebaseToken,
} = require(
  '../middlewares/auth.middleware'
)

const router =
  express.Router()


router.use(
  verifyFirebaseToken
)


router.get(
  '/',
  obtenerNotificacionesProfesional
)


router.patch(
  '/marcar-todas-leidas',
  marcarTodasLeidas
)


router.patch(
  '/:id/leida',
  marcarNotificacionLeida
)


module.exports =
  router
