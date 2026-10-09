const {
  db,
  FieldValue,
} = require('../config/firebase')

const progresoRef = (uid) =>
  db
    .collection('usuarios')
    .doc(uid)
    .collection('progreso_ritmo')
    .doc('resumen')

const obtenerProgresoRitmo = async (req, res) => {
  try {
    const uid = req.user?.uid

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: 'No se pudo identificar al usuario autenticado.',
      })
    }

    const snap = await progresoRef(uid).get()

    if (!snap.exists) {
      return res.json({
        success: true,
        existe: false,
        progreso: null,
      })
    }

    const data = snap.data() || {}

    return res.json({
      success: true,
      existe: true,
      progreso: {
        xp: Number(data.xp) || 0,
        nivel: data.nivel || 'Primer latido',
        temasCompletados:
          Array.isArray(data.temasCompletados)
            ? data.temasCompletados
            : [],
        intentos: Number(data.intentos) || 0,
        mejorPuntaje: Number(data.mejorPuntaje) || 0,
        temasAReforzar:
          Array.isArray(data.temasAReforzar)
            ? data.temasAReforzar
            : [],
      },
    })
  } catch (error) {
    console.error('Error al obtener progreso de ritmo:', error)

    return res.status(500).json({
      success: false,
      message: 'No fue posible obtener el progreso del módulo de ritmo.',
    })
  }
}

const guardarProgresoRitmo = async (req, res) => {
  try {
    const uid = req.user?.uid

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: 'No se pudo identificar al usuario autenticado.',
      })
    }

    const {
      xp = 0,
      nivel = 'Primer latido',
      temasCompletados = [],
      intentos = 0,
      mejorPuntaje = 0,
      temasAReforzar = [],
    } = req.body || {}

    const progreso = {
      xp: Math.max(0, Number(xp) || 0),
      nivel: String(nivel || 'Primer latido'),
      temasCompletados:
        Array.isArray(temasCompletados)
          ? temasCompletados.map(String)
          : [],
      intentos: Math.max(0, Number(intentos) || 0),
      mejorPuntaje:
        Math.max(
          0,
          Math.min(10, Number(mejorPuntaje) || 0)
        ),
      temasAReforzar:
        Array.isArray(temasAReforzar)
          ? temasAReforzar.map(String)
          : [],
      actualizadoEn: FieldValue.serverTimestamp(),
    }

    await progresoRef(uid).set(
      progreso,
      { merge: true }
    )

    return res.json({
      success: true,
      existe: true,
      progreso: {
        xp: progreso.xp,
        nivel: progreso.nivel,
        temasCompletados: progreso.temasCompletados,
        intentos: progreso.intentos,
        mejorPuntaje: progreso.mejorPuntaje,
        temasAReforzar: progreso.temasAReforzar,
      },
      message: 'Progreso de ritmo guardado correctamente.',
    })
  } catch (error) {
    console.error('Error al guardar progreso de ritmo:', error)

    return res.status(500).json({
      success: false,
      message: 'No fue posible guardar el progreso del módulo de ritmo.',
    })
  }
}

const guardarIntentoRitmo = async (req, res) => {
  try {
    const uid = req.user?.uid

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: 'No se pudo identificar al usuario autenticado.',
      })
    }

    const {
      puntaje = 0,
      total = 10,
      dificultad = 'Básico',
      xpGanado = 0,
      temasFallados = [],
    } = req.body || {}

    const intento = {
      puntaje: Math.max(0, Number(puntaje) || 0),
      total: Math.max(1, Number(total) || 10),
      dificultad: String(dificultad || 'Básico'),
      xpGanado: Math.max(0, Number(xpGanado) || 0),
      temasFallados:
        Array.isArray(temasFallados)
          ? temasFallados.map(String)
          : [],
      creadoEn: FieldValue.serverTimestamp(),
    }

    const ref =
      await progresoRef(uid)
        .collection('intentos')
        .add(intento)

    return res.status(201).json({
      success: true,
      id: ref.id,
      message: 'Intento guardado correctamente.',
    })
  } catch (error) {
    console.error('Error al guardar intento de ritmo:', error)

    return res.status(500).json({
      success: false,
      message: 'No fue posible guardar el intento.',
    })
  }
}

module.exports = {
  obtenerProgresoRitmo,
  guardarProgresoRitmo,
  guardarIntentoRitmo,
}
