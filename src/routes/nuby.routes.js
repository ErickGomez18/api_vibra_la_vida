const express =
  require('express')

const {
  obtenerEspecialistasNuby,
} =
  require('../controllers/nuby.controller')

const {
  verifyFirebaseToken,
} =
  require('../middlewares/auth.middleware')

const router =
  express.Router()

router.get(
  '/especialistas',
  verifyFirebaseToken,
  obtenerEspecialistasNuby
)

module.exports =
  router
