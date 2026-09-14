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
// Requiere usuario autenticado.
//
// La app recibe:
//
// - timestamp
// - signature
// - apiKey
// - cloudName
// - folder
//
// ============================================================================

async function generateUploadSignature(req, res) {

  try {


    // ========================================================================
    // USUARIO AUTENTICADO
    // ========================================================================

    const uid =
      req.user?.uid;


    if (!uid) {

      return res.status(401).json({

        success: false,

        message:
          "Usuario no autenticado.",

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
    // CARPETA DEL USUARIO
    // ========================================================================
    //
    // Cada usuario tendrá su propia carpeta:
    //
    // laboratorios/{uid}
    //
    // ========================================================================

    const folder =
      `laboratorios/${uid}`;


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
      cloudinary.utils.api_sign_request(

        paramsToSign,

        process.env.CLOUDINARY_API_SECRET
      );


    // ========================================================================
    // RESPUESTA
    // ========================================================================

    return res.status(200).json({

      success: true,

      timestamp,

      signature,

      apiKey:
        process.env.CLOUDINARY_API_KEY,

      cloudName:
        process.env.CLOUDINARY_CLOUD_NAME,

      folder,

    });


  } catch (error) {


    console.error(
      "Error en generateUploadSignature:",
      error
    );


    return res.status(500).json({

      success: false,

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