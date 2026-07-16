'use client';

import { Save, Search, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';

const privileged = ['Administrador de Sistemas','Gerente','Coordinador General','Coordinadora Administrativa y Financiera','Talento Humano','Experiencia al Agremiado'];
const fields = [
  ['documento','Documento'],['lugarExpedicion','Lugar de expedición'],['fechaIngreso','Fecha de ingreso'],['fechaRetiro','Fecha de retiro'],
  ['estadoLaboral','Estado laboral'],['formacion','Formación'],['proceso','Proceso / cargo'],['rh','RH'],['direccion','Dirección'],['barrio','Barrio'],
  ['municipio','Municipio'],['departamento','Departamento'],['sexo','Sexo'],['estadoCivil','Estado civil'],['personasCargo','Personas a cargo'],
  ['fechaNacimiento','Fecha de nacimiento'],['tipoContrato','Tipo de contrato'],['formaPago','Forma de pago'],['banco','Banco'],['tipoCuenta','Tipo de cuenta'],
  ['numeroCuenta','Número de cuenta'],['eps','EPS'],['afp','AFP'],['arl','ARL'],['cajaCompensacion','Caja de compensación'],
] as const;

export function TechnicalProfiles({ db, save, session, setSession }: any) {
  const canBrowse = privileged.includes(session.rol);
  const affiliates = db.usuarios.filter((user: any) => user.rol === 'Agremiado');
  const [query, setQuery] = useState('');
  const [targetId, setTargetId] = useState(session.id);
  const target = db.usuarios.find((user: any) => user.id === targetId) || session;
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const profile = drafts[target.id] || db.perfiles?.[target.id] || { userId: target.id, documento: '', estadoLaboral: target.activo ? 'ACTIVO' : 'INACTIVO' };
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return affiliates.slice(0, 30);
    return affiliates.filter((user: any) => `${user.nombre} ${user.correo} ${db.perfiles?.[user.id]?.documento || ''}`.toLowerCase().includes(needle)).slice(0, 50);
  }, [affiliates, db.perfiles, query]);
  const updateUser = (patch: any) => setDrafts((current) => ({ ...current, [target.id]: { ...profile, __user: { ...(profile.__user || target), ...patch } } }));
  const updateProfile = (field: string, value: any) => setDrafts((current) => ({ ...current, [target.id]: { ...profile, [field]: value } }));
  const guardar = () => {
    const nextUser = profile.__user || target;
    const cleanProfile = { ...profile, userId: target.id }; delete cleanProfile.__user;
    const usuarios = db.usuarios.map((user: any) => user.id === target.id ? nextUser : user);
    const next = { ...db, usuarios, perfiles: { ...(db.perfiles || {}), [target.id]: cleanProfile } };
    save(next, `Ficha técnica actualizada: ${nextUser.nombre}`);
    if (target.id === session.id) setSession(nextUser);
    alert('Ficha técnica guardada en Supabase.');
  };
  const userDraft = profile.__user || target;
  return <div className="grid">
    {canBrowse && <div className="card span4"><h3><Search size={18}/> Directorio de fichas</h3><p className="muted">Busca por nombre, usuario o documento.</p><input className="input" value={query} placeholder="Buscar afiliado partícipe" onChange={(event) => setQuery(event.target.value)}/><div style={{maxHeight:520,overflow:'auto'}}>{matches.map((user: any) => <button className={`btn ${user.id===target.id?'primary':''}`} style={{width:'100%',justifyContent:'flex-start',marginBottom:6}} key={user.id} onClick={() => setTargetId(user.id)}><UserRound size={15}/>{user.nombre}</button>)}</div></div>}
    <div className={`card ${canBrowse?'span8':'span12'}`}><h3>Ficha técnica del afiliado partícipe</h3><p className="muted">Información laboral, institucional y de seguridad social importada desde la base maestra.</p><div className="grid">
      <div className="span6 field"><label>Nombre completo</label><input className="input" value={userDraft.nombre || ''} onChange={(event) => updateUser({nombre:event.target.value})}/></div>
      <div className="span6 field"><label>Usuario del portal</label><input className="input" value={userDraft.correo || ''} onChange={(event) => updateUser({correo:event.target.value})}/></div>
      <div className="span4 field"><label>Tipo</label><select value={userDraft.tipo || 'Asistencial'} onChange={(event) => updateUser({tipo:event.target.value})}><option>Asistencial</option><option>Administrativo</option></select></div>
      <div className="span4 field"><label>Entidad</label><select value={userDraft.entidadId || ''} onChange={(event) => updateUser({entidadId:event.target.value,areaId:''})}><option value="">Seleccione</option>{db.entidades.map((entity:any)=><option key={entity.id} value={entity.id}>{entity.nombre}</option>)}</select></div>
      <div className="span4 field"><label>Área</label><select value={userDraft.areaId || ''} onChange={(event) => updateUser({areaId:event.target.value})}><option value="">Seleccione</option>{db.areas.filter((area:any)=>area.entidadId===userDraft.entidadId).map((area:any)=><option key={area.id} value={area.id}>{area.nombre}</option>)}</select></div>
      {fields.map(([field,label]) => <div className="span4 field" key={field}><label>{label}</label><input className="input" type={field.toLowerCase().includes('fecha')?'date':'text'} value={profile[field] ?? ''} onChange={(event) => updateProfile(field,event.target.value)}/></div>)}
      <div className="span12 field"><label>Observaciones</label><textarea className="input" rows={3} value={profile.observaciones || ''} onChange={(event) => updateProfile('observaciones',event.target.value)}/></div>
    </div><button className="btn primary" onClick={guardar}><Save size={16}/> Guardar ficha en Supabase</button></div>
  </div>;
}
