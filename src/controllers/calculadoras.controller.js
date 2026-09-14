// ==========================================================
// CONTROLADOR DE CALCULADORAS
// ==========================================================

// Convierte un valor recibido a número.
// Si no es válido, regresa null.
const convertirNumero = (valor) => {
  const numero = Number(valor)

  return Number.isFinite(numero)
    ? numero
    : null
}


// Valida que un número esté dentro de un rango.
const validarRango = (
  valor,
  minimo,
  maximo
) => {
  return (
    valor !== null &&
    valor >= minimo &&
    valor <= maximo
  )
}


// ==========================================================
// CLASIFICACIÓN DEL IMC
// ==========================================================

const obtenerCategoriaIMC = (imc) => {
  if (imc < 18.5) {
    return {
      categoria: 'Bajo peso',
      clase: 'bajo-peso',
      descripcion:
        'Un IMC menor a 18.5 se considera bajo peso en adultos.',
    }
  }

  if (
    imc >= 18.5 &&
    imc < 25
  ) {
    return {
      categoria: 'Normal',
      clase: 'normal',
      descripcion:
        'Un IMC entre 18.5 y 24.9 se considera normal en adultos.',
    }
  }

  if (
    imc >= 25 &&
    imc < 30
  ) {
    return {
      categoria: 'Sobrepeso',
      clase: 'sobrepeso',
      descripcion:
        'Un IMC entre 25 y 29.9 se considera sobrepeso en adultos.',
    }
  }

  return {
    categoria: 'Obesidad',
    clase: 'obesidad',
    descripcion:
      'Un IMC de 30 o más se considera obesidad en adultos.',
  }
}


// ==========================================================
// CALCULAR IMC
// ==========================================================

const calcularIMC = (req, res) => {
  const edad =
    convertirNumero(
      req.body.edad
    )

  const peso =
    convertirNumero(
      req.body.peso
    )

  const altura =
    convertirNumero(
      req.body.altura
    )

  const genero =
    req.body.genero ||
    'no especificado'

  const errores = {}


  if (
    !validarRango(
      edad,
      10,
      100
    )
  ) {
    errores.edad =
      'Ingresa una edad válida entre 10 y 100 años.'
  }


  if (
    !validarRango(
      peso,
      25,
      250
    )
  ) {
    errores.peso =
      'Ingresa un peso válido entre 25 y 250 kg.'
  }


  if (
    !validarRango(
      altura,
      100,
      230
    )
  ) {
    errores.altura =
      'Ingresa una altura válida entre 100 y 230 cm.'
  }


  if (
    Object.keys(errores)
      .length > 0
  ) {
    return res
      .status(400)
      .json({
        ok: false,
        mensaje:
          'Datos inválidos',
        errores,
      })
  }


  const alturaMetros =
    altura / 100


  const imc =
    peso /
    (
      alturaMetros *
      alturaMetros
    )


  const datosCategoria =
    obtenerCategoriaIMC(imc)


  const posicionIndicador =
    Math.min(
      100,
      Math.max(
        0,
        (
          (imc - 15) /
          (40 - 15)
        ) * 100
      )
    )


  return res.json({
    ok: true,

    datosEntrada: {
      edad,
      peso,
      altura,
      genero,
    },

    resultado: {
      valor:
        Number(
          imc.toFixed(1)
        ),

      categoria:
        datosCategoria
          .categoria,

      clase:
        datosCategoria
          .clase,

      descripcion:
        datosCategoria
          .descripcion,

      posicionIndicador,
    },
  })
}


// ==========================================================
// CALCULAR CALORÍAS
// ==========================================================

const calcularCalorias = (
  req,
  res
) => {
  const sexo =
    req.body.sexo ||
    'hombre'

  const edad =
    convertirNumero(
      req.body.edad
    )

  const peso =
    convertirNumero(
      req.body.peso
    )

  const altura =
    convertirNumero(
      req.body.altura
    )

  const actividad =
    convertirNumero(
      req.body.actividad
    )

  const errores = {}


  if (
    ![
      'hombre',
      'mujer',
    ].includes(sexo)
  ) {
    errores.sexo =
      'Selecciona un sexo válido.'
  }


  if (
    !validarRango(
      edad,
      10,
      100
    )
  ) {
    errores.edad =
      'Ingresa una edad válida entre 10 y 100 años.'
  }


  if (
    !validarRango(
      peso,
      25,
      250
    )
  ) {
    errores.peso =
      'Ingresa un peso válido entre 25 y 250 kg.'
  }


  if (
    !validarRango(
      altura,
      100,
      230
    )
  ) {
    errores.altura =
      'Ingresa una altura válida entre 100 y 230 cm.'
  }


  if (
    !validarRango(
      actividad,
      1.2,
      1.9
    )
  ) {
    errores.actividad =
      'Selecciona un nivel de actividad válido.'
  }


  if (
    Object.keys(errores)
      .length > 0
  ) {
    return res
      .status(400)
      .json({
        ok: false,
        mensaje:
          'Datos inválidos',
        errores,
      })
  }


  let metabolismoBasal = 0


  if (
    sexo === 'hombre'
  ) {
    metabolismoBasal =
      10 * peso +
      6.25 * altura -
      5 * edad +
      5
  } else {
    metabolismoBasal =
      10 * peso +
      6.25 * altura -
      5 * edad -
      161
  }


  const caloriasMantenimiento =
    metabolismoBasal *
    actividad


  return res.json({
    ok: true,

    datosEntrada: {
      sexo,
      edad,
      peso,
      altura,
      actividad,
    },

    resultado: {
      metabolismoBasal:
        Math.round(
          metabolismoBasal
        ),

      caloriasMantenimiento:
        Math.round(
          caloriasMantenimiento
        ),

      caloriasPerderPeso:
        Math.round(
          caloriasMantenimiento -
          400
        ),

      caloriasGanarPeso:
        Math.round(
          caloriasMantenimiento +
          300
        ),
    },
  })
}


// ==========================================================
// EXPORTAR FUNCIONES
// ==========================================================

module.exports = {
  calcularIMC,
  calcularCalorias,
}