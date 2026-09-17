// ============================================================================
// UPLOADS CONTROLLER
// ============================================================================
//
// Genera una firma segura para permitir que Android o iOS
// suban archivos directamente a Cloudinary.
//
// El API Secret se queda únicamente en el backend.
//
// ============================================================================

const cloudinary =
  require("../config/cloudinary");


// ============================================================================
// GENERAR FIRMA
// ============================================================================
//
// POST /api/uploads/signature
//
// Opcional:
//
// POST /api/uploads/signature?tipo=perfil
// POST /api/uploads/signature?tipo=laboratorio
//
// Carpetas:
//
// perfil      -> perfiles/{uid}
// laboratorio -> laboratorios/{uid}
//
// ============================================================================

async function generateUploadSignature(
  req,
  res
) {

  try {


    // ========================================================================
    // USUARIO AUTENTICADO
    // ========================================================================

    const uid =
      req.user?.uid;


    if (
      !uid
    ) {

      return res
        .status(401)
        .json({

          success:
            false,

          message:
            "Usuario no autenticado.",
        });
    }


    // ========================================================================
    // TIPO DE ARCHIVO
    // ========================================================================

    const tipo =
      String(
        req.query?.tipo ||
        "laboratorio"
      )
        .trim()
        .toLowerCase();


    const tiposPermitidos =
      [
        "laboratorio",
        "perfil",
      ];


    if (
      !tiposPermitidos.includes(
        tipo
      )
    ) {

      return res
        .status(400)
        .json({

          success:
            false,

          message:
            "Tipo de archivo no válido.",
        });
    }


    // ========================================================================
    // TIMESTAMP
    // ========================================================================

    const timestamp =
      Math.round(
        Date.now() / 1000
      );


    // ========================================================================
    // CARPETA
    // ========================================================================

    const folder =
      tipo === "perfil"

        ? `perfiles/${uid}`

        : `laboratorios/${uid}`;


    // ========================================================================
    // PARÁMETROS A FIRMAR
    // ========================================================================

    const paramsToSign = {

      timestamp,

      folder,
    };


    // ========================================================================
    // GENERAR FIRMA
    // ========================================================================

    const signature =
      cloudinary
        .utils
        .api_sign_request(

          paramsToSign,

          process.env
            .CLOUDINARY_API_SECRET
        );


    // ========================================================================
    // RESPUESTA
    // ========================================================================

    return res
      .status(200)
      .json({

        success:
          true,

        timestamp,

        signature,

        apiKey:
          process.env
            .CLOUDINARY_API_KEY,

        cloudName:
          process.env
            .CLOUDINARY_CLOUD_NAME,

        folder,

        tipo,
      });


  } catch (
    error
  ) {


    console.error(
      "Error en generateUploadSignature:",
      error
    );


    return res
      .status(500)
      .json({

        success:
          false,

        message:
          "Error al generar firma de Cloudinary.",

        error:
          error.message,
      });
  }
}


// ============================================================================
// EXPORTAR
// ============================================================================

module.exports = {

  generateUploadSignature,
};
