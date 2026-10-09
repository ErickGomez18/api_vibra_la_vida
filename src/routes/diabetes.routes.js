// ============================================================================
// RUTAS DE PROGRESO DE DIABETES - VIBRA LA VIDA
// ============================================================================

const express =
  require('express')

const {
  obtenerProgresoDiabetes,
  guardarProgresoDiabetes,
  guardarIntentoDiabetes,
} = require('../controllers/diabetes.controller')

const {
  verifyFirebaseToken,
} = require('../middlewares/auth.middleware')


const router =
  express.Router()


// ============================================================================
// TODAS NECESITAN TOKEN FIREBASE
// ============================================================================

router.use(
  verifyFirebaseToken
)


// GET /api/diabetes/progreso
router.get(
  '/progreso',
  obtenerProgresoDiabetes
)


// PUT /api/diabetes/progreso
router.put(
  '/progreso',
  guardarProgresoDiabetes
)


// POST /api/diabetes/intentos
router.post(
  '/intentos',
  guardarIntentoDiabetes
)


module.exports =
  router
