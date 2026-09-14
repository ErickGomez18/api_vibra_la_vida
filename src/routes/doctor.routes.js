const express = require("express");

const {
  verificarCedula,
} = require("../controllers/doctor.controller");

const router = express.Router();

router.post(
  "/verificar-cedula",
  verificarCedula
);

module.exports = router;