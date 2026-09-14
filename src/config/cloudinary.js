// ============================================================================
// CLOUDINARY CONFIG
// ============================================================================
//
// Configuración central de Cloudinary.
//
// Las credenciales se leen desde variables de entorno.
//
// NUNCA ponemos:
// - API Secret
// - API Key
//
// directamente en Android ni dentro del código público.
//
// ============================================================================

const cloudinary =
  require("cloudinary").v2;


// ============================================================================
// CONFIGURAR CLOUDINARY
// ============================================================================

cloudinary.config({

  cloud_name:
    process.env.CLOUDINARY_CLOUD_NAME,

  api_key:
    process.env.CLOUDINARY_API_KEY,

  api_secret:
    process.env.CLOUDINARY_API_SECRET,

  secure:
    true,
});


// ============================================================================
// EXPORTAR
// ============================================================================

module.exports =
  cloudinary;