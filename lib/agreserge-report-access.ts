const CROSS_HOSPITAL_ROLES = new Set([
  "Administrador de Sistemas",
  "Coordinación AGRESERGE",
  "Coordinación General",
  "Coordinador General",
  "Director Ejecutivo",
  "Coordinador de Proceso AGRESERGE",
]);

export function hasCrossHospitalReportAccess(user: {
  rol?: string;
  entidadId?: string;
  entidad_id?: string;
}) {
  const entityId = user.entidadId || user.entidad_id;
  return entityId === "oficina-agreserge" || CROSS_HOSPITAL_ROLES.has(user.rol || "");
}
