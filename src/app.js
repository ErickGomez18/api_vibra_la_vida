// ============================================================================
// APP.JS
// ============================================================================


// Importamos Express.
const express =
  require("express");


// Importamos CORS para permitir peticiones desde Android y Web.
const cors =
  require("cors");


// ============================================================================
// IMPORTAR RUTAS
// ============================================================================

const authRoutes =
  require("./routes/auth.routes");


const userRoutes =
  require("./routes/user.routes");


const resultsRoutes =
  require("./routes/results.routes");


const healthRoutes =
  require("./routes/health.routes");


const historyRoutes =
  require("./routes/history.routes");


const medicamentosRoutes =
  require("./routes/medicamentos.routes");


const bitacoraRoutes =
  require("./routes/bitacora.routes");


// ============================================================================
// CREAR APLICACIÓN EXPRESS
// ============================================================================

const app =
  express();


// ============================================================================
// MIDDLEWARES GLOBALES
// ============================================================================


// Permite recibir JSON en el body.
app.use(
  express.json()
);


// Permite peticiones desde otros orígenes.
app.use(
  cors()
);


// ============================================================================
// RUTA PRINCIPAL
// ============================================================================

app.get(
  "/",

  (req, res) => {

    res.json({

      success:
        true,

      message:
        "API RESTful de Vibra la vida funcionando con Firebase.",

    });
  }
);


// ============================================================================
// STATUS
// ============================================================================

app.get(
  "/api/status",

  (req, res) => {

    res.json({

      success:
        true,

      message:
        "Servidor activo.",

      timestamp:
        new Date().toISOString(),

    });
  }
);


// ============================================================================
// RUTAS PRINCIPALES
// ============================================================================


// ---------------------------------------------------------------------------
// AUTENTICACIÓN
// ---------------------------------------------------------------------------

app.use(
  "/api/auth",
  authRoutes
);


// ---------------------------------------------------------------------------
// USUARIOS
// ---------------------------------------------------------------------------

app.use(
  "/api/users",
  userRoutes
);


// ---------------------------------------------------------------------------
// RESULTADOS
// ---------------------------------------------------------------------------

app.use(
  "/api/results",
  resultsRoutes
);


// ---------------------------------------------------------------------------
// HEALTH CONNECT
// ---------------------------------------------------------------------------

app.use(
  "/api/health-connect",
  healthRoutes
);


// ---------------------------------------------------------------------------
// HISTORIAL GENERAL
// ---------------------------------------------------------------------------
//
// GET /api/history
//
// Conservamos este módulo porque reúne:
//
// - perfil
// - resultados
// - Health Connect
//
// ---------------------------------------------------------------------------

app.use(
  "/api/history",
  historyRoutes
);


// ---------------------------------------------------------------------------
// MEDICAMENTOS
// ---------------------------------------------------------------------------
//
// GET    /api/medicamentos
// POST   /api/medicamentos
// PUT    /api/medicamentos/:id
// DELETE /api/medicamentos/:id
//
// ---------------------------------------------------------------------------

app.use(
  "/api/medicamentos",
  medicamentosRoutes
);


// ---------------------------------------------------------------------------
// BITÁCORA DE SALUD
// ---------------------------------------------------------------------------
//
// MEDICIONES:
//
// GET    /api/bitacora/registros
// POST   /api/bitacora/registros
// PUT    /api/bitacora/registros/:id
// DELETE /api/bitacora/registros/:id
//
// LABORATORIOS:
//
// GET    /api/bitacora/laboratorios
// POST   /api/bitacora/laboratorios
// PUT    /api/bitacora/laboratorios/:id
// DELETE /api/bitacora/laboratorios/:id
//
// ---------------------------------------------------------------------------

app.use(
  "/api/bitacora",
  bitacoraRoutes
);


// ============================================================================
// RUTA NO ENCONTRADA
// ============================================================================
//
// IMPORTANTE:
//
// Esta ruta siempre debe quedar AL FINAL,
// después de todas las demás rutas.
//
// ============================================================================

app.use(
  (req, res) => {

    res.status(404).json({

      success:
        false,

      message:
        "Ruta no encontrada.",

    });
  }
);


// ============================================================================
// EXPORTAR APP
// ============================================================================

module.exports =
  app;