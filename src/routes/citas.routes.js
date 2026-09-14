const express = require('express')

const {
  obtenerMisCitas,
  crearCita,
  actualizarCita,
  eliminarCita,
} = require('../controllers/citas.controller')

const {
  verifyFirebaseToken,
} = require('../middlewares/auth.middleware')

const router = express.Router()

// Todas las rutas de citas necesitan sesión Firebase válida.
router.use(verifyFirebaseToken)

router.get('/', obtenerMisCitas)
router.post('/', crearCita)
router.put('/:id', actualizarCita)
router.delete('/:id', eliminarCita)

module.exports = router
