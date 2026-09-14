// ==========================================================
// CONTROLADOR DE DOCTORES
// VIBRA LA VIDA
// ==========================================================


// ----------------------------------------------------------
// NORMALIZAR TEXTO
// ----------------------------------------------------------
// Permite comparar nombres aunque:
// - tengan acentos
// - usen mayúsculas o minúsculas
// - tengan espacios adicionales
// ----------------------------------------------------------

const normalizarTexto = (texto = '') => {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}


// ----------------------------------------------------------
// VERIFICAR CÉDULA PROFESIONAL
// ----------------------------------------------------------

const verificarCedula = async (req, res) => {
  try {

    const {
      cedula,
      nombreCompleto,
    } = req.body || {}


    // ------------------------------------------------------
    // VALIDAR DATOS RECIBIDOS
    // ------------------------------------------------------

    if (!cedula) {
      return res.status(400).json({
        ok: false,
        valida: false,
        mensaje:
          'Ingresa una cédula profesional.',
      })
    }


    if (!nombreCompleto) {
      return res.status(400).json({
        ok: false,
        valida: false,
        mensaje:
          'Ingresa el nombre completo del profesional.',
      })
    }


    // Las cédulas que estamos consultando
    // deben contener únicamente números.
    if (!/^\d{7,8}$/.test(cedula)) {
      return res.status(400).json({
        ok: false,
        valida: false,
        mensaje:
          'La cédula profesional debe contener 7 u 8 dígitos.',
      })
    }


    // ------------------------------------------------------
    // OBTENER API KEY
    // ------------------------------------------------------

    const apiKey =
      process.env.CEDULA_API_KEY


    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        valida: false,
        mensaje:
          'La verificación de cédulas no está configurada.',
      })
    }


    // ------------------------------------------------------
    // CONSULTAR IDOO
    // ------------------------------------------------------

    const respuesta = await fetch(
      'https://api.idoo.dev/v1/consultar-cedula-profesional/',
      {
        method: 'POST',

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          cedula,
        }),
      }
    )


    const datos =
      await respuesta.json()


    // ------------------------------------------------------
    // CÉDULA NO VÁLIDA
    // ------------------------------------------------------

    if (
      !respuesta.ok ||
      !datos.valid
    ) {
      return res
        .status(
          respuesta.status || 400
        )
        .json({
          ok: false,
          valida: false,

          mensaje:
            datos.message ||
            'No fue posible verificar la cédula profesional.',
        })
    }


    // ------------------------------------------------------
    // OBTENER PROFESIONISTA
    // ------------------------------------------------------
    // La API devuelve:
    //
    // data: [
    //   {
    //     cedula: "...",
    //     nombre: "...",
    //     primerApellido: "...",
    //     segundoApellido: "..."
    //   }
    // ]
    // ------------------------------------------------------

    const profesionista =
      Array.isArray(datos.data)
        ? datos.data[0]
        : null


    if (!profesionista) {
      return res.status(404).json({
        ok: false,
        valida: false,

        mensaje:
          'No se encontraron datos asociados a esta cédula.',
      })
    }


    // ------------------------------------------------------
    // CONSTRUIR NOMBRE COMPLETO OFICIAL
    // ------------------------------------------------------

    const nombreRegistro = [
      profesionista.nombre,
      profesionista.primerApellido,
      profesionista.segundoApellido,
    ]
      .filter(Boolean)
      .join(' ')


    // ------------------------------------------------------
    // COMPARAR NOMBRES
    // ------------------------------------------------------

    const nombreIngresado =
      normalizarTexto(
        nombreCompleto
      )


    const nombreOficial =
      normalizarTexto(
        nombreRegistro
      )


    if (
      nombreIngresado !==
      nombreOficial
    ) {
      return res.status(400).json({
        ok: false,
        valida: false,

        mensaje:
          'La cédula existe, pero el nombre no coincide con el registro profesional.',
      })
    }


    // ------------------------------------------------------
    // CÉDULA VERIFICADA
    // ------------------------------------------------------

    return res.json({
      ok: true,
      valida: true,

      mensaje:
        'Cédula profesional verificada correctamente.',

      profesional: {
        cedula:
          profesionista.cedula,

        nombre:
          nombreRegistro,

        profesion:
          profesionista.profesion ||
          profesionista.titulo ||
          null,

        institucion:
          profesionista.institucion ||
          null,

        anioRegistro:
          profesionista.anioRegistro ||
          null,
      },
    })

  } catch (error) {

    console.error(
      'Error al verificar cédula:',
      error
    )


    return res.status(500).json({
      ok: false,
      valida: false,

      mensaje:
        'Ocurrió un error al consultar la cédula profesional.',
    })
  }
}


// ----------------------------------------------------------
// EXPORTAR
// ----------------------------------------------------------

module.exports = {
  verificarCedula,
}