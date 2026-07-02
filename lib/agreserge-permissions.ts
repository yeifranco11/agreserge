export const adminRoles = new Set([
  'Administrador de Sistemas',
  'Gerente',
  'Coordinador General',
  'Coordinadora Administrativa y Financiera',
  'Talento Humano',
  'Experiencia al Agremiado',
]);

export const reviewRoles = new Set([
  'Administrador de Sistemas',
  'Coordinador General',
  'Coordinador de Proceso AGRESERGE',
  'Talento Humano',
  'Experiencia al Agremiado',
]);

export function canAdmin(user: any) {
  return Boolean(user?.activo && adminRoles.has(user?.rol));
}

export function canReviewDocuments(user: any) {
  return Boolean(user?.activo && reviewRoles.has(user?.rol));
}

export function canAccessOwnData(user: any, ownerId: string) {
  return Boolean(user?.activo && user?.id === ownerId);
}
