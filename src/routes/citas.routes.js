// ==========================================================
// RUTAS DE CITAS - VIBRA LA VIDA
// ==========================================================
//
// Este archivo unifica las acciones de citas para:
//
// - Panel web del profesional
// - Aplicación Android del paciente
//
// Todas las rutas requieren un token válido de Firebase.
//
// ==========================================================

const express =
  require('express')


const {
  obtenerMisCitas,
  crearCita,
  actualizarCita,
  confirmarCitaPaciente,
  solicitarReagendaPaciente,
  cancelarCitaPaciente,
  reagendarCitaProfesional,
  eliminarCita,
} =
  require('../controllers/citas.controller')


const {
  verifyFirebaseToken,
} =
  require('../middlewares/auth.middleware')


const router =
  express.Router()


// ==========================================================
// AUTENTICACIÓN
// ==========================================================
//
// Todas las rutas de citas necesitan una sesión Firebase
// válida.
//
// verifyFirebaseToken obtiene el UID desde el Bearer Token
// y lo coloca en:
//
// req.user
//
// ==========================================================

router.use(
  verifyFirebaseToken
)


// ==========================================================
// OBTENER MIS CITAS
// ==========================================================
//
// GET /api/citas
//
// Profesional:
// devuelve las citas donde él es el especialista.
//
// Paciente:
// devuelve las citas que le pertenecen.
//
// ==========================================================

router.get(
  '/',
  obtenerMisCitas
)


// ==========================================================
// CREAR CITA
// ==========================================================
//
// POST /api/citas
//
// Solo el profesional de salud puede crear una cita.
//
// ==========================================================

router.post(
  '/',
  crearCita
)


// ==========================================================
// CONFIRMAR CITA COMO PACIENTE
// ==========================================================
//
// POST /api/citas/:id/confirmar
//
// Antes de llamar esta ruta, Android/Web reautentican
// al paciente con Firebase usando su contraseña.
//
// La contraseña:
//
// - NO se manda a Express.
// - NO se guarda.
// - Firebase la valida directamente.
//
// El backend verifica auth_time en el token nuevo.
//
// ==========================================================

router.post(
  '/:id/confirmar',
  confirmarCitaPaciente
)


// ==========================================================
// SOLICITAR REAGENDA COMO PACIENTE
// ==========================================================
//
// POST /api/citas/:id/solicitar-reagenda
//
// El paciente NO cambia directamente la fecha de la cita.
//
// Solamente envía:
//
// {
//   "motivoReagenda": "...",
//   "fechaSolicitada": "...",
//   "horaSolicitada": "..."
// }
//
// El estado pasa a:
//
// reagenda_solicitada
//
// y se crea una notificación para el profesional.
//
// ==========================================================

router.post(
  '/:id/solicitar-reagenda',
  solicitarReagendaPaciente
)


// ==========================================================
// CANCELAR CITA COMO PACIENTE
// ==========================================================
//
// POST /api/citas/:id/cancelar
//
// Body:
//
// {
//   "motivoCancelacion": "..."
// }
//
// La cita NO se elimina de Firestore.
//
// Solamente cambia a:
//
// cancelada
//
// De esta forma permanece en el historial.
//
// También se crea una notificación para el profesional.
//
// ==========================================================

router.post(
  '/:id/cancelar',
  cancelarCitaPaciente
)


// ==========================================================
// REAGENDAR CITA COMO PROFESIONAL
// ==========================================================
//
// POST /api/citas/:id/reagendar-profesional
//
// El profesional acepta/reagenda y propone una nueva
// fecha y hora.
//
// Después de cambiar la fecha/hora la cita vuelve a:
//
// pendiente
//
// para que el paciente confirme nuevamente.
//
// ==========================================================

router.post(
  '/:id/reagendar-profesional',
  reagendarCitaProfesional
)


// ==========================================================
// ACTUALIZAR CITA
// ==========================================================
//
// PUT /api/citas/:id
//
// Principalmente utilizado por el profesional para editar
// datos generales de la cita.
//
// El controlador también contiene validaciones para impedir
// que un paciente edite campos que no le corresponden.
//
// ==========================================================

router.put(
  '/:id',
  actualizarCita
)


// ==========================================================
// ELIMINAR CITA
// ==========================================================
//
// DELETE /api/citas/:id
//
// Solo el profesional puede eliminar físicamente una cita.
//
// El paciente NO debe usar esta ruta para cancelar.
//
// ==========================================================

router.delete(
  '/:id',
  eliminarCita
)


module.exports =
  router