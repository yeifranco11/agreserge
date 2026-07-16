import { hashPassword } from './agreserge-auth';
import { canAdmin } from './agreserge-permissions';
import { requireSupabaseAdmin } from './supabase-admin';

const docsAdministrativo = ['Cédula de ciudadanía al 150%','Foto fondo blanco para carnet','Hoja de vida función pública','Diplomas y actas de grado','RUT actualizado','Antecedentes judiciales','Antecedentes fiscales','Antecedentes disciplinarios','Medidas correctivas','REDAM','Certificaciones laborales','Tratamiento de datos personales','Confidencialidad','Certificación bancaria','Certificación EPS','Fondo de pensiones','ARL','Caja de compensación','Examen médico laboral','Contrato o vinculación administrativa'];
const docsAsistencial = ['Cédula de ciudadanía al 150%','Foto fondo blanco para carnet','Hoja de vida función pública','Diplomas y actas de grado','Tarjeta profesional','RETHUS actualizado','Póliza de responsabilidad civil','Cursos obligatorios asistenciales','Carnet de vacunas','RUT actualizado','Antecedentes judiciales','Antecedentes fiscales','Antecedentes disciplinarios','Medidas correctivas','REDAM','Certificación bancaria','Certificación EPS','Fondo de pensiones','ARL','Caja de compensación','Examen médico laboral','Contrato o vinculación asistencial'];

export const defaultPermissions: Record<string, string[]> = {
  'Agremiado':['Ficha técnica','Cargue documental','Nómina y comprobantes','Solicitudes y firmas','Trámites administrativos','AGREBOT'],
  'Líder Institucional':['Inicio','Mis agremiados','Informes de actividades','Solicitudes y firmas','AGREBOT'],
  'Líder de Proceso':['Inicio','Mis agremiados','Informes de actividades','Solicitudes y firmas','AGREBOT'],
  'Coordinadora':['Inicio','Dashboard gerente','Ficha técnica','Informes de actividades','Asignación mensual','AGREBOT','Auditoría'],
  'Coordinación AGRESERGE':['Inicio','Dashboard gerente','Revisión documental','Informes de actividades','Asignación mensual','Ficha técnica','AGREBOT','Auditoría'],
  'Coordinación Administrativa':['Inicio','Dashboard gerente','Ficha técnica','Informes de actividades','Asignación mensual','Nómina y comprobantes','Solicitudes y firmas','Trámites administrativos','AGREBOT','Auditoría'],
  'Coordinación Asistencial':['Inicio','Dashboard gerente','Ficha técnica','Revisión documental','Mis agremiados','Informes de actividades','Solicitudes y firmas','AGREBOT','Auditoría'],
  'Tesorería':['Inicio','Dashboard gerente','Nómina y comprobantes','Trámites administrativos','Informes de actividades','AGREBOT','Auditoría'],
  'Coordinación General':['Inicio','Dashboard gerente','Parámetros institucionales','Ficha técnica','Revisión documental','Informes de actividades','Asignación mensual','Usuarios y claves','AGREBOT','Auditoría'],
  'Coordinador de Sede':['Inicio','Dashboard gerente','Ficha técnica','Mis agremiados','Informes de actividades','Solicitudes y firmas','AGREBOT','Auditoría'],
  'Coordinador de Proceso AGRESERGE':['Inicio','Informes de actividades','Asignación mensual','AGREBOT','Auditoría'],
  'Coordinador General':['Inicio','Dashboard gerente','Revisión documental','Informes de actividades','Asignación mensual','Usuarios y claves','AGREBOT','Auditoría'],
  'Coordinadora Administrativa y Financiera':['Inicio','Dashboard gerente','Informes de actividades','Asignación mensual','Nómina y comprobantes','Solicitudes y firmas','Trámites administrativos','Auditoría','AGREBOT'],
  'Talento Humano':['Inicio','Parámetros institucionales','Usuarios y claves','Ficha técnica','AGREBOT'],
  'Experiencia al Agremiado':['Inicio','Usuarios y claves','Ficha técnica','AGREBOT'],
  'Administrador de Sistemas':['Inicio','Dashboard gerente','Parámetros institucionales','Ficha técnica','Cargue documental','Revisión documental','Mis agremiados','Informes de actividades','Asignación mensual','Nómina y comprobantes','Solicitudes y firmas','Trámites administrativos','Permisos por perfil','Usuarios y claves','AGREBOT','Auditoría'],
  'Gerente':['Inicio','Dashboard gerente','Informes de actividades','Auditoría','AGREBOT'],
};

const requiredOperationalModules: Record<string, string[]> = {
  'Agremiado': ['Nómina y comprobantes', 'Solicitudes y firmas'],
  'Líder Institucional': ['Solicitudes y firmas'],
  'Líder de Proceso': ['Solicitudes y firmas'],
  'Coordinadora': ['Ficha técnica', 'Informes de actividades', 'AGREBOT'],
  'Coordinación AGRESERGE': ['Ficha técnica', 'Informes de actividades', 'AGREBOT'],
  'Coordinación Administrativa': ['Ficha técnica', 'Nómina y comprobantes', 'Solicitudes y firmas'],
  'Coordinación Asistencial': ['Ficha técnica', 'Revisión documental', 'Solicitudes y firmas'],
  'Tesorería': ['Nómina y comprobantes'],
  'Coordinación General': ['Ficha técnica', 'AGREBOT'],
  'Coordinador de Sede': ['Ficha técnica', 'Solicitudes y firmas'],
  'Coordinadora Administrativa y Financiera': ['Ficha técnica', 'Nómina y comprobantes', 'Solicitudes y firmas'],
  'Coordinador General': ['Ficha técnica'],
  'Talento Humano': ['Ficha técnica'],
  'Experiencia al Agremiado': ['Ficha técnica'],
  'Administrador de Sistemas': ['Ficha técnica', 'Nómina y comprobantes', 'Solicitudes y firmas', 'AGREBOT'],
};

function supportDocs(tipo = 'Asistencial', agremiadoId = '') {
  return (tipo === 'Administrativo' ? docsAdministrativo : docsAsistencial).map((nombre, index) => ({
    id: `${agremiadoId || 'doc'}-${index}`,
    nombre,
    categoria: tipo,
    estado: 'Pendiente',
    observacion: 'Pendiente por cargar',
    agremiadoId,
  }));
}

export function seedDB() {
  return {
    usuarios:[
      {id:'u1',nombre:'Administrador de Sistemas',correo:'admin@agreserge.com',clave:'1234',rol:'Administrador de Sistemas',activo:true,cargo:'Administrador plataforma'},
      {id:'u2',nombre:'Gerente AGRESERGE',correo:'gerente@agreserge.com',clave:'1234',rol:'Gerente',activo:true,cargo:'Gerente'},
      {id:'u3',nombre:'Coordinador General Documental',correo:'general@agreserge.com',clave:'1234',rol:'Coordinador General',activo:true,cargo:'Revisión documental'},
      {id:'u4',nombre:'Coordinadora Administrativa y Financiera',correo:'financiera@agreserge.com',clave:'1234',rol:'Coordinadora Administrativa y Financiera',activo:true},
      {id:'u5',nombre:'Talento Humano AGRESERGE',correo:'th@agreserge.com',clave:'1234',rol:'Talento Humano',activo:true},
      {id:'u6',nombre:'Experiencia al Agremiado',correo:'experiencia@agreserge.com',clave:'1234',rol:'Experiencia al Agremiado',activo:true},
      {id:'u7',nombre:'Líder Urgencias HGC',correo:'lider@agreserge.com',clave:'1234',rol:'Líder Institucional',entidadId:'hgc',areaId:'urg',activo:true,cargo:'Líder institucional'},
      {id:'u8',nombre:'Coordinador de Proceso AGRESERGE',correo:'proceso@agreserge.com',clave:'1234',rol:'Coordinador de Proceso AGRESERGE',activo:true},
      {id:'u9',nombre:'Agremiado Demo',correo:'agremiado@agreserge.com',clave:'1234',rol:'Agremiado',tipo:'Asistencial',entidadId:'hgc',areaId:'urg',liderId:'u7',activo:true,cargo:'Auxiliar de enfermería'},
    ],
    entidades:[
      {id:'hgc',nombre:'Hospital Gonzalo Contreras E.S.E.',nit:'891.900.XXX-1',ciudad:'La Unión, Valle',direccion:'La Unión, Valle'},
      {id:'hsf',nombre:'Hospital Sagrada Familia E.S.E.',nit:'891.900.XXX-2',ciudad:'Toro, Valle',direccion:'Toro, Valle'},
    ],
    areas:[
      {id:'urg',nombre:'Urgencias',entidadId:'hgc',tipo:'Asistencial',liderId:'u7'},
      {id:'hos',nombre:'Hospitalización',entidadId:'hgc',tipo:'Asistencial'},
      {id:'adm',nombre:'Administrativa y financiera',entidadId:'hgc',tipo:'Administrativo'},
      {id:'fac',nombre:'Facturación',entidadId:'hsf',tipo:'Administrativo'},
    ],
    documentos:{ u9: supportDocs('Asistencial', 'u9') },
    permisos: defaultPermissions,
    asignacionesBase:[],
    asignacionesMensuales:[],
    tramites:[],
    auditoria:['Sistema inicializado en Supabase.'],
  };
}

function userFromRow(row: any) {
  return {
    id: row.id,
    nombre: row.nombre,
    correo: row.correo,
    clave: '',
    rol: row.rol,
    tipo: row.tipo ?? undefined,
    entidadId: row.entidad_id ?? undefined,
    areaId: row.area_id ?? undefined,
    liderId: row.lider_id ?? undefined,
    activo: row.activo,
    cargo: row.cargo ?? undefined,
    telefono: row.telefono ?? undefined,
  };
}

function profileFromRow(row: any) {
  return {
    userId: row.user_id,
    documento: row.documento,
    lugarExpedicion: row.lugar_expedicion ?? '',
    cnv: row.cnv ?? '',
    fechaIngreso: row.fecha_ingreso ?? '',
    fechaRetiro: row.fecha_retiro ?? '',
    estadoLaboral: row.estado_laboral ?? '',
    formacion: row.formacion ?? '',
    proceso: row.proceso ?? '',
    direccion: row.direccion ?? '',
    barrio: row.barrio ?? '',
    municipio: row.municipio ?? '',
    departamento: row.departamento ?? '',
    sexo: row.sexo ?? '',
    estadoCivil: row.estado_civil ?? '',
    personasCargo: row.personas_cargo ?? '',
    fechaNacimiento: row.fecha_nacimiento ?? '',
    lugarNacimiento: row.lugar_nacimiento ?? '',
    tipoContrato: row.tipo_contrato ?? '',
    formaPago: row.forma_pago ?? '',
    banco: row.banco ?? '',
    tipoCuenta: row.tipo_cuenta ?? '',
    numeroCuenta: row.numero_cuenta ?? '',
    eps: row.eps ?? '',
    afp: row.afp ?? '',
    arl: row.arl ?? '',
    cajaCompensacion: row.caja_compensacion ?? '',
    rh: row.rh ?? '',
    talla: row.talla ?? '',
    retencionFuente: row.retencion_fuente ?? '',
    observaciones: row.observaciones ?? '',
    fechaExamenMedico: row.fecha_examen_medico ?? '',
    ciudadVotacion: row.ciudad_votacion ?? '',
    puestoVotacion: row.puesto_votacion ?? '',
    fuenteOrigen: row.fuente_origen ?? '',
    datosAdicionales: row.datos_adicionales ?? {},
  };
}

function documentFromRow(row: any) {
  return {
    id: row.id,
    nombre: row.nombre,
    categoria: row.categoria ?? '',
    estado: row.estado,
    observacion: row.observacion ?? '',
    vencimiento: row.vencimiento ?? undefined,
    fechaCarga: row.fecha_carga ?? undefined,
    agremiadoId: row.agremiado_id,
    archivo: row.archivo_path ? {
      nombre: row.archivo_nombre ?? row.nombre,
      tipo: row.archivo_tipo ?? 'application/octet-stream',
      tamano: Number(row.archivo_tamano ?? 0),
      dataUrl: row.archivo_path,
      fecha: row.fecha_carga ?? '',
    } : undefined,
  };
}

export async function ensureSeeded() {
  const supabase = requireSupabaseAdmin();
  const { count, error } = await supabase.from('agreserge_users').select('id', { count: 'exact', head: true });
  if (error) throw error;
  if ((count ?? 0) > 0) return;

  const db = seedDB();
  await saveFullDB(db, { force: true });
}

export async function loadDB() {
  const supabase = requireSupabaseAdmin();
  const [
    users,
    profiles,
    entities,
    areas,
    documents,
    permissions,
    baseAssignments,
    monthlyAssignments,
    procedures,
    audit,
  ] = await Promise.all([
    supabase.from('agreserge_users').select('*').order('nombre'),
    supabase.from('agreserge_profiles').select('*'),
    supabase.from('agreserge_entities').select('*').order('nombre'),
    supabase.from('agreserge_areas').select('*').order('nombre'),
    supabase.from('agreserge_documents').select('*').order('nombre'),
    supabase.from('agreserge_permissions').select('*'),
    supabase.from('agreserge_assignments').select('*').eq('es_base', true).order('anexo'),
    supabase.from('agreserge_assignments').select('*').eq('es_base', false).order('created_at', { ascending: false }),
    supabase.from('agreserge_procedures').select('*').order('created_at', { ascending: false }),
    supabase.from('agreserge_audit').select('*').order('created_at', { ascending: false }).limit(200),
  ]);

  const error = [users.error, profiles.error, entities.error, areas.error, documents.error, permissions.error, baseAssignments.error, monthlyAssignments.error, procedures.error, audit.error].find(Boolean);
  if (error) throw error;

  const docs: Record<string, any[]> = {};
  for (const row of ((documents.data ?? []) as any[])) {
    docs[row.agremiado_id] = docs[row.agremiado_id] ?? [];
    docs[row.agremiado_id].push(documentFromRow(row));
  }

  return {
    usuarios: ((users.data ?? []) as any[]).map(userFromRow),
    perfiles: Object.fromEntries(((profiles.data ?? []) as any[]).map((row: any) => [row.user_id, profileFromRow(row)])),
    entidades: ((entities.data ?? []) as any[]).map((row: any) => ({
      id: row.id,
      nombre: row.nombre,
      nit: row.nit ?? '',
      ciudad: row.ciudad ?? '',
      direccion: row.direccion ?? '',
      fechaContrato: row.fecha_contrato ?? undefined,
      contrato: row.contrato_path ? { nombre: 'Contrato', tipo: 'application/octet-stream', tamano: 0, dataUrl: row.contrato_path, fecha: row.fecha_contrato ?? '' } : undefined,
    })),
    areas: ((areas.data ?? []) as any[]).map((row: any) => ({ id: row.id, nombre: row.nombre, entidadId: row.entidad_id, tipo: row.tipo, liderId: row.lider_id ?? undefined })),
    documentos: docs,
    permisos: {
      ...defaultPermissions,
      ...Object.fromEntries(((permissions.data ?? []) as any[]).map((row: any) => [row.rol, Array.from(new Set([...(row.modulos ?? []), ...(requiredOperationalModules[row.rol] ?? [])]))])),
    },
    asignacionesBase: ((baseAssignments.data ?? []) as any[]).map(assignmentFromRow),
    asignacionesMensuales: ((monthlyAssignments.data ?? []) as any[]).map(assignmentFromRow),
    tramites: ((procedures.data ?? []) as any[]).map((row: any) => ({
      id: row.id,
      agremiadoId: row.agremiado_id,
      tipo: row.tipo,
      periodo: row.periodo ?? '',
      estado: row.estado,
      fuenteGoogle: row.fuente_google ?? '',
      generado: row.generado ?? '',
      observacion: row.observacion ?? '',
      archivo: row.archivo_path ? { nombre: 'Trámite', tipo: 'application/octet-stream', tamano: 0, dataUrl: row.archivo_path, fecha: row.generado ?? '' } : undefined,
    })),
    auditoria: ((audit.data ?? []) as any[]).map((row: any) => `${new Date(row.created_at).toLocaleString()} · ${row.evento}`),
  };
}

function assignmentFromRow(row: any) {
  return {
    id: row.id,
    anexo: row.anexo,
    titulo: row.titulo,
    tipo: row.tipo,
    responsableId: row.responsable_id,
    coordinadorId: row.coordinador_id ?? undefined,
    mes: row.mes,
    anio: row.anio,
    plantillaGoogle: row.plantilla_google ?? '',
    hojaGoogle: row.hoja_google ?? '',
    copiaGoogle: row.copia_google ?? '',
    fechaLimite: row.fecha_limite ?? '',
    fechaCarga: row.fecha_carga ?? undefined,
    estado: row.estado,
    observacion: row.observacion ?? '',
    notificarEstadistica: row.notificar_estadistica,
    archivo: row.archivo_path ? { nombre: 'Archivo', tipo: 'application/octet-stream', tamano: 0, dataUrl: row.archivo_path, fecha: row.fecha_carga ?? '' } : undefined,
  };
}

async function replaceTable(table: string, rows: any[], key = 'id') {
  const supabase = requireSupabaseAdmin() as any;
  const ids = rows.map((row) => row[key]).filter(Boolean);
  const deleteQuery = supabase.from(table).delete();
  const deleteResult = ids.length
    ? await deleteQuery.not(key, 'in', `(${ids.map((id) => `"${id}"`).join(',')})`)
    : await deleteQuery.not(key, 'is', null);
  if (deleteResult.error) throw deleteResult.error;

  if (!rows.length) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict: key });
  if (error) throw error;
}

export async function saveFullDB(db: any, options: { force?: boolean; actor?: any } = {}) {
  if (!options.force && !canAdmin(options.actor)) throw new Error('Este perfil no tiene permiso para sincronizar toda la base.');

  const userRows = (db.usuarios ?? []).map((user: any) => ({
    id: user.id,
    nombre: user.nombre,
    correo: user.correo,
    clave_hash: user.clave ? hashPassword(user.clave) : undefined,
    rol: user.rol,
    tipo: user.tipo ?? null,
    entidad_id: user.entidadId ?? null,
    area_id: user.areaId ?? null,
    lider_id: user.liderId ?? null,
    activo: user.activo ?? true,
    cargo: user.cargo ?? null,
    telefono: user.telefono ?? null,
    updated_at: new Date().toISOString(),
  }));

  const profileRows = Object.values(db.perfiles ?? {}).map((item: any) => ({
    user_id: item.userId,
    documento: item.documento,
    lugar_expedicion: item.lugarExpedicion || null,
    cnv: item.cnv || null,
    fecha_ingreso: item.fechaIngreso || null,
    fecha_retiro: item.fechaRetiro || null,
    estado_laboral: item.estadoLaboral || null,
    formacion: item.formacion || null,
    proceso: item.proceso || null,
    direccion: item.direccion || null,
    barrio: item.barrio || null,
    municipio: item.municipio || null,
    departamento: item.departamento || null,
    sexo: item.sexo || null,
    estado_civil: item.estadoCivil || null,
    personas_cargo: item.personasCargo === '' ? null : Number(item.personasCargo),
    fecha_nacimiento: item.fechaNacimiento || null,
    lugar_nacimiento: item.lugarNacimiento || null,
    tipo_contrato: item.tipoContrato || null,
    forma_pago: item.formaPago || null,
    banco: item.banco || null,
    tipo_cuenta: item.tipoCuenta || null,
    numero_cuenta: item.numeroCuenta || null,
    eps: item.eps || null,
    afp: item.afp || null,
    arl: item.arl || null,
    caja_compensacion: item.cajaCompensacion || null,
    rh: item.rh || null,
    talla: item.talla || null,
    retencion_fuente: item.retencionFuente || null,
    observaciones: item.observaciones || null,
    fecha_examen_medico: item.fechaExamenMedico || null,
    ciudad_votacion: item.ciudadVotacion || null,
    puesto_votacion: item.puestoVotacion || null,
    fuente_origen: item.fuenteOrigen || null,
    datos_adicionales: item.datosAdicionales ?? {},
    updated_at: new Date().toISOString(),
  }));

  const entityRows = (db.entidades ?? []).map((item: any) => ({
    id: item.id,
    nombre: item.nombre,
    nit: item.nit ?? null,
    ciudad: item.ciudad ?? null,
    direccion: item.direccion ?? null,
    contrato_path: item.contrato?.dataUrl ?? null,
    fecha_contrato: item.fechaContrato ?? null,
    updated_at: new Date().toISOString(),
  }));

  const areaRows = (db.areas ?? []).map((item: any) => ({
    id: item.id,
    nombre: item.nombre,
    entidad_id: item.entidadId,
    tipo: item.tipo,
    lider_id: item.liderId ?? null,
    updated_at: new Date().toISOString(),
  }));

  const documentRows = Object.values(db.documentos ?? {}).flat().map((item: any) => ({
    id: item.id,
    agremiado_id: item.agremiadoId,
    nombre: item.nombre,
    categoria: item.categoria ?? null,
    estado: item.estado ?? 'Pendiente',
    observacion: item.observacion ?? null,
    vencimiento: item.vencimiento ?? null,
    archivo_path: item.archivo?.dataUrl ?? null,
    archivo_nombre: item.archivo?.nombre ?? null,
    archivo_tipo: item.archivo?.tipo ?? null,
    archivo_tamano: item.archivo?.tamano ?? null,
    fecha_carga: item.fechaCarga ?? null,
    updated_at: new Date().toISOString(),
  }));

  const permissionRows = Object.entries(db.permisos ?? {}).map(([rol, modulos]) => ({ rol, modulos, updated_at: new Date().toISOString() }));
  const assignmentRows = [...(db.asignacionesBase ?? []).map((item: any) => ({ ...item, esBase: true })), ...(db.asignacionesMensuales ?? []).map((item: any) => ({ ...item, esBase: false }))].map((item: any) => ({
    id: item.id,
    anexo: item.anexo,
    titulo: item.titulo,
    tipo: item.tipo,
    responsable_id: item.responsableId,
    coordinador_id: item.coordinadorId ?? null,
    mes: item.mes,
    anio: item.anio,
    plantilla_google: item.plantillaGoogle ?? null,
    hoja_google: item.hojaGoogle ?? null,
    copia_google: item.copiaGoogle ?? null,
    fecha_limite: item.fechaLimite ?? null,
    fecha_carga: item.fechaCarga ?? null,
    archivo_path: item.archivo?.dataUrl ?? null,
    estado: item.estado ?? 'Asignado',
    observacion: item.observacion ?? null,
    notificar_estadistica: item.notificarEstadistica ?? false,
    es_base: item.esBase,
    updated_at: new Date().toISOString(),
  }));

  const procedureRows = (db.tramites ?? []).map((item: any) => ({
    id: item.id,
    agremiado_id: item.agremiadoId,
    tipo: item.tipo,
    periodo: item.periodo ?? null,
    estado: item.estado ?? 'Solicitado',
    fuente_google: item.fuenteGoogle ?? null,
    archivo_path: item.archivo?.dataUrl ?? null,
    generado: item.generado ? String(item.generado).slice(0, 10) : null,
    observacion: item.observacion ?? null,
    updated_at: new Date().toISOString(),
  }));

  await replaceTable('agreserge_users', userRows);
  if (profileRows.length) {
    const { error } = await (requireSupabaseAdmin() as any).from('agreserge_profiles').upsert(profileRows, { onConflict: 'user_id' });
    if (error) throw error;
  }
  await replaceTable('agreserge_entities', entityRows);
  await replaceTable('agreserge_areas', areaRows);
  await replaceTable('agreserge_documents', documentRows);
  await replaceTable('agreserge_permissions', permissionRows, 'rol');
  await replaceTable('agreserge_assignments', assignmentRows);
  await replaceTable('agreserge_procedures', procedureRows);
}
