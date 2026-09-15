// ============================================================================
// ROLES UTILS
// ============================================================================
//
// Sistema de roles de Vibra la vida.
//
// A partir de ahora:
//
// roles = ["paciente"]
//
// o:
//
// roles = ["especialista"]
//
// o:
//
// roles = ["paciente", "especialista"]
//
// IMPORTANTE:
//
// El campo "rol" antiguo se conserva temporalmente por compatibilidad
// con el panel web actual.
//
// Ejemplos legacy:
//
// rol = "usuario"       -> paciente
// rol = "paciente"      -> paciente
// rol = "especialista"  -> especialista
//
// ============================================================================


// ============================================================================
// NORMALIZAR ROLES
// ============================================================================
//
// Convierte:
// - roles nuevos
// - rol legacy
//
// en un arreglo limpio y sin duplicados.
//
// ============================================================================

function normalizarRoles(
  rolesActuales = [],
  rolLegacy = null
) {

  const resultado =
    Array.isArray(rolesActuales)
      ? rolesActuales
          .map(
            rol =>
              String(rol)
                .trim()
                .toLowerCase()
          )
          .filter(Boolean)
      : [];


  // --------------------------------------------------------------------------
  // MIGRACIÓN SUAVE DESDE EL CAMPO ANTIGUO "rol"
  // --------------------------------------------------------------------------

  if (
    rolLegacy
  ) {

    const rolNormalizado =
      String(rolLegacy)
        .trim()
        .toLowerCase();


    if (
      rolNormalizado === "especialista"
    ) {

      resultado.push(
        "especialista"
      );
    }


    if (
      rolNormalizado === "usuario" ||
      rolNormalizado === "paciente"
    ) {

      resultado.push(
        "paciente"
      );
    }
  }


  // --------------------------------------------------------------------------
  // SOLO PERMITIMOS LOS ROLES CONOCIDOS
  // --------------------------------------------------------------------------

  const permitidos =
    new Set([
      "paciente",
      "especialista",
    ]);


  return [
    ...new Set(
      resultado.filter(
        rol =>
          permitidos.has(
            rol
          )
      )
    ),
  ];
}


// ============================================================================
// AGREGAR ROL SIN DUPLICAR
// ============================================================================

function agregarRol(
  rolesActuales,
  nuevoRol
) {

  const roles =
    normalizarRoles(
      rolesActuales
    );


  const rol =
    String(nuevoRol)
      .trim()
      .toLowerCase();


  if (
    ![
      "paciente",
      "especialista",
    ].includes(
      rol
    )
  ) {

    return roles;
  }


  if (
    !roles.includes(
      rol
    )
  ) {

    roles.push(
      rol
    );
  }


  return roles;
}


// ============================================================================
// COMPROBAR ROL
// ============================================================================

function tieneRol(
  rolesActuales,
  rolBuscado
) {

  const roles =
    normalizarRoles(
      rolesActuales
    );


  return roles.includes(
    String(rolBuscado)
      .trim()
      .toLowerCase()
  );
}


// ============================================================================
// ROL LEGACY
// ============================================================================
//
// Mientras la web todavía use el campo antiguo:
//
// rol = "usuario"
// rol = "especialista"
//
// mantenemos un valor compatible.
//
// REGLA:
//
// Si tiene rol especialista:
// rol legacy = "especialista"
//
// De lo contrario:
// rol legacy = "usuario"
//
// Esto permite que un especialista que también sea paciente siga entrando
// al panel profesional mientras migramos la web a "roles".
//
// ============================================================================

function obtenerRolLegacy(
  rolesActuales
) {

  const roles =
    normalizarRoles(
      rolesActuales
    );


  if (
    roles.includes(
      "especialista"
    )
  ) {

    return "especialista";
  }


  return "usuario";
}


// ============================================================================
// EXPORTAR
// ============================================================================

module.exports = {

  normalizarRoles,

  agregarRol,

  tieneRol,

  obtenerRolLegacy,
};
