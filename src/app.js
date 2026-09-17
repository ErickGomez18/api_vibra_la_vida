// ============================================================================
// APP.JS
// ============================================================================


// ============================================================================
// IMPORTACIONES
// ============================================================================

// Importamos Express.
const express =
  require("express");


// Importamos CORS para permitir peticiones desde Android, iOS y Web.
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


const uploadsRoutes =
  require("./routes/uploads.routes");


const doctorRoutes =
  require("./routes/doctor.routes");


const calculadorasRoutes =
  require("./routes/calculadoras.routes");


const citasRoutes =
  require("./routes/citas.routes");


// ============================================================================
// NUEVAS RUTAS
// ============================================================================

// Adherencia de medicamentos:
// tomado / omitido
const adherenciaMedicamentosRoutes =
  require("./routes/adherenciaMedicamentos.routes");


// Respuesta del paciente a las citas:
// confirmar / reagendar / cancelar
const citasPacienteRoutes =
  require("./routes/citasPaciente.routes");



// Relación segura entre especialistas y pacientes.
const especialistaPacientesRoutes =
  require("./routes/especialistaPacientes.routes");


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


// Permite peticiones desde Android, iOS y Web.
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
// Reúne:
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
// ADHERENCIA DE MEDICAMENTOS
// ---------------------------------------------------------------------------
//
// GET  /api/adherencia-medicamentos
// POST /api/adherencia-medicamentos
//
// Permite registrar si el paciente reporta:
//
// - tomado
// - omitido
//
// ---------------------------------------------------------------------------

app.use(
  "/api/adherencia-medicamentos",
  adherenciaMedicamentosRoutes
);


// ---------------------------------------------------------------------------
// BITÁCORA DE SALUD
// ---------------------------------------------------------------------------
//
// MEDICIONES:
// GET    /api/bitacora/registros
// POST   /api/bitacora/registros
// PUT    /api/bitacora/registros/:id
// DELETE /api/bitacora/registros/:id
//
// LABORATORIOS:
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


// ---------------------------------------------------------------------------
// CLOUDINARY
// ---------------------------------------------------------------------------
//
// POST /api/uploads/signature
//
// ---------------------------------------------------------------------------

app.use(
  "/api/uploads",
  uploadsRoutes
);


// ---------------------------------------------------------------------------
// PROFESIONALES / VERIFICACIÓN DE CÉDULA
// ---------------------------------------------------------------------------
//
// POST /api/doctores/verificar-cedula
//
// ---------------------------------------------------------------------------

app.use(
  "/api/doctores",
  doctorRoutes
);


// ---------------------------------------------------------------------------
// CALCULADORAS
// ---------------------------------------------------------------------------
//
// POST /api/calculadoras/imc
// POST /api/calculadoras/calorias
//
// ---------------------------------------------------------------------------

app.use(
  "/api/calculadoras",
  calculadorasRoutes
);


// ---------------------------------------------------------------------------
// CITAS MÉDICAS
// ---------------------------------------------------------------------------
//
// GET    /api/citas
// POST   /api/citas
// PUT    /api/citas/:id
// DELETE /api/citas/:id
//
// ---------------------------------------------------------------------------

app.use(
  "/api/citas",
  citasRoutes
);


// ---------------------------------------------------------------------------
// RESPUESTAS DEL PACIENTE A CITAS
// ---------------------------------------------------------------------------
//
// PATCH /api/citas/:id/respuesta-paciente
//
// Permite:
//
// - confirmar asistencia
// - solicitar reagendación
// - solicitar cancelación
//
// ---------------------------------------------------------------------------

app.use(
  "/api/citas",
  citasPacienteRoutes
);



// ---------------------------------------------------------------------------
// RELACIÓN ESPECIALISTA - PACIENTE
// ---------------------------------------------------------------------------
//
// Flujo seguro:
//
// 1. Especialista envía solicitud.
// 2. Paciente acepta o rechaza.
// 3. Solo las relaciones "activas" permitirán acceso posterior
//    a datos de salud.
//
// ---------------------------------------------------------------------------

app.use(
  "/api/especialista-pacientes",
  especialistaPacientesRoutes
);


// ============================================================================
// RUTA NO ENCONTRADA
// ============================================================================
//
// IMPORTANTE:
// Esta ruta siempre debe quedar AL FINAL.
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