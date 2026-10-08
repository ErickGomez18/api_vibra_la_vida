// ==========================================================
// CONTROLADOR DE NOTIFICACIONES DEL PROFESIONAL
// ==========================================================

const {
  db,
  FieldValue,
} = require('../config/firebase')


const obtenerNotificacionesProfesional = async (
  req,
  res
) => {
  try {
    const profesionalUid =
      req.user.uid

    const snapshot =
      await db
        .collection('notificaciones_profesional')
        .where(
          'profesionalUid',
          '==',
          profesionalUid
        )
        .get()

    const notificaciones =
      snapshot.docs
        .map((documento) => {
          const datos =
            documento.data()

          return {
            id:
              documento.id,

            ...datos,

            creadoEn:
              datos.creadoEn?.toDate
                ? datos.creadoEn
                    .toDate()
                    .toISOString()
                : null,
          }
        })
        .sort((a, b) => {
          const fa =
            a.creadoEn
              ? new Date(a.creadoEn).getTime()
              : 0

          const fb =
            b.creadoEn
              ? new Date(b.creadoEn).getTime()
              : 0

          return fb - fa
        })

    return res.json({
      success: true,

      noLeidas:
        notificaciones.filter(
          (n) =>
            !n.leida
        ).length,

      notificaciones,
    })

  } catch (error) {
    console.error(
      'Error al obtener notificaciones:',
      error
    )

    return res.status(500).json({
      success: false,
      message:
        'No fue posible obtener las notificaciones.',
    })
  }
}


const marcarNotificacionLeida = async (
  req,
  res
) => {
  try {
    const profesionalUid =
      req.user.uid

    const ref =
      db
        .collection('notificaciones_profesional')
        .doc(req.params.id)

    const snap =
      await ref.get()

    if (!snap.exists) {
      return res.status(404).json({
        success: false,
        message:
          'La notificación no existe.',
      })
    }

    if (
      snap.data().profesionalUid !==
      profesionalUid
    ) {
      return res.status(403).json({
        success: false,
        message:
          'No puedes modificar esta notificación.',
      })
    }

    await ref.update({
      leida:
        true,

      leidaEn:
        FieldValue.serverTimestamp(),
    })

    return res.json({
      success: true,
    })

  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        'No fue posible actualizar la notificación.',
    })
  }
}


const marcarTodasLeidas = async (
  req,
  res
) => {
  try {
    const profesionalUid =
      req.user.uid

    const snapshot =
      await db
        .collection('notificaciones_profesional')
        .where(
          'profesionalUid',
          '==',
          profesionalUid
        )
        .get()

    const batch =
      db.batch()

    snapshot.docs.forEach(
      (documento) => {
        if (
          documento.data().leida !== true
        ) {
          batch.update(
            documento.ref,
            {
              leida:
                true,

              leidaEn:
                FieldValue.serverTimestamp(),
            }
          )
        }
      }
    )

    await batch.commit()

    return res.json({
      success: true,
    })

  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        'No fue posible actualizar las notificaciones.',
    })
  }
}


module.exports = {
  obtenerNotificacionesProfesional,
  marcarNotificacionLeida,
  marcarTodasLeidas,
}
