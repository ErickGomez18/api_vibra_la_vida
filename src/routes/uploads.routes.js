// ============================================================================
// UPLOADS ROUTES
// ============================================================================

const express =
  require("express");


const {
  generateUploadSignature,
} =
  require("../controllers/uploads.controller");


const {
  verifyFirebaseToken,
} =
  require("../middlewares/auth.middleware");


const router =
  express.Router();


// ============================================================================
// GENERAR FIRMA CLOUDINARY
// ============================================================================
//
// POST /api/uploads/signature
//
// ============================================================================

router.post(
  "/signature",
  verifyFirebaseToken,
  generateUploadSignature
);


// ============================================================================
// EXPORTAR
// ============================================================================

module.exports =
  router;