const express =
  require('express')

const {
  calcularIMC,
  calcularCalorias,
} = require(
  '../controllers/calculadoras.controller'
)

const router =
  express.Router()


// Calcular IMC
router.post(
  '/imc',
  calcularIMC
)


// Calcular calorías
router.post(
  '/calorias',
  calcularCalorias
)


module.exports = router