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

app.use(
  "/api/auth",
  authRoutes
);


app.use(
  "/api/users",
  userRoutes
);


app.use(
  "/api/results",
  resultsRoutes
);


app.use(
  "/api/health-connect",
  healthRoutes
);


app.use(
  "/api/history",
  historyRoutes
);


app.use(
  "/api/medicamentos",
  medicamentosRoutes
);


// ============================================================================
// RUTA NO ENCONTRADA
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