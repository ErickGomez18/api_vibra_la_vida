// ==========================================================
// APP PRINCIPAL - API VIBRA LA VIDA
// ==========================================================

const express = require('express')
const cors = require('cors')

const diabetesRoutes = require('./routes/diabetes.routes')
const authRoutes = require('./routes/auth.routes')
const userRoutes = require('./routes/user.routes')
const resultsRoutes = require('./routes/results.routes')
const healthRoutes = require('./routes/health.routes')
const historyRoutes = require('./routes/history.routes')
const medicamentosRoutes = require('./routes/medicamentos.routes')
const bitacoraRoutes = require('./routes/bitacora.routes')
const uploadsRoutes = require('./routes/uploads.routes')
const doctorRoutes = require('./routes/doctor.routes')
const calculadorasRoutes = require('./routes/calculadoras.routes')
const citasRoutes = require('./routes/citas.routes')
const seguimientoRoutes = require('./routes/seguimiento.routes')
const notificacionesRoutes = require('./routes/notificaciones.routes')

const app = express()

app.use(express.json())
app.use(cors())

app.get('/', (req, res) => {
  res.json({
    success: true,
    message:
      'API RESTful de Vibra la Vida funcionando con Firebase.',
  })
})

app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor activo.',
    timestamp: new Date().toISOString(),
  })
})


app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/results', resultsRoutes)
app.use('/api/health-connect', healthRoutes)
app.use('/api/history', historyRoutes)
app.use('/api/medicamentos', medicamentosRoutes)
app.use('/api/bitacora', bitacoraRoutes)
app.use('/api/uploads', uploadsRoutes)
app.use('/api/doctores', doctorRoutes)
app.use('/api/calculadoras', calculadorasRoutes)
app.use('/api/citas', citasRoutes)
app.use('/api/seguimiento', seguimientoRoutes)
app.use('/api/notificaciones', notificacionesRoutes)
app.use('/api/diabetes', diabetesRoutes)

// Siempre al final.
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    mensaje: 'Ruta no encontrada.',
  })
})

module.exports = app
