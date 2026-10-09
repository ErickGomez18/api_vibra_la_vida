// ==========================================================
// RUTAS DE PROGRESO DE HÁBITOS SALUDABLES
// ==========================================================

const express =
  require('express')

const {
  obtenerProgresoHabitos,
  guardarProgresoHabitos,
  guardarIntentoHabitos,
} =
  require('../controllers/habitos.controller')

const {
  verifyFirebaseToken,
} =
  require('../middlewares/auth.middleware')


const router =
  express.Router()


router.use(
  verifyFirebaseToken
)


router.get(
  '/progreso',
  obtenerProgresoHabitos
)


router.put(
  '/progreso',
  guardarProgresoHabitos
)


router.post(
  '/intentos',
  guardarIntentoHabitos
)


module.exports =
  router
