const express = require('express')

const {
  obtenerProgresoRitmo,
  guardarProgresoRitmo,
  guardarIntentoRitmo,
} = require('../controllers/ritmo.controller')

const {
  verifyFirebaseToken,
} = require('../middlewares/auth.middleware')

const router = express.Router()

router.use(verifyFirebaseToken)

router.get('/progreso', obtenerProgresoRitmo)
router.put('/progreso', guardarProgresoRitmo)
router.post('/intentos', guardarIntentoRitmo)

module.exports = router
