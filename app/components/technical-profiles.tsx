'use client';

import { Plus, Save, Search, Trash2, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';

const privileged = ['Administrador de Sistemas','Coordinadora','Coordinación AGRESERGE','Coordinación General','Coordinación Administrativa','Coordinación Asistencial','Coordinador de Sede','Talento Humano','Gerente','Coordinador General','Coordinadora Administrativa y Financiera','Experiencia al Agremiado','Asesora de Calidad','Director Ejecutivo','Seguridad y Salud en el Trabajo'];
const required = ['documento','fechaNacimiento','direccion','barrio','municipio','sexo','estadoCivil','eps'];
const personal = [
  ['documento','Número de documento','text'],['lugarExpedicion','Lugar de expedición','text'],['fechaNacimiento','Fecha de nacimiento','date'],['lugarNacimiento','Lugar de nacimiento','text'],
  ['direccion','Dirección','text'],['barrio','Barrio','text'],['municipio','Municipio','text'],['departamento','Departamento','text'],['sexo','Género','select:Masculino|Femenino|Otro'],
  ['estadoCivil','Estado civil','select:Soltero(a)|Casado(a)|Unión libre|Separado(a)|Viudo(a)'],['eps','EPS','text'],['regimen','Régimen','select:Contributivo|Subsidiado'],
  ['nivelEscolaridad','Nivel de escolaridad','select:Primaria|Secundaria|Técnico|Tecnólogo|Universitario|Posgrado'],['condicionEspecial','Condición especial','text'],
] as const;
const work = [
  ['fechaIngreso','Fecha de ingreso','date'],['estadoLaboral','Estado laboral','select:ACTIVO|INACTIVO'],['formacion','Formación','text'],['proceso','Área o servicio','text'],
  ['tipoContrato','Tipo de vinculación','text'],['antiguedadProceso','Antigüedad en el área o servicio','select:Menos de 1 año|1 a 5 años|5 a 10 años|10 a 15 años|Más de 15 años'],
  ['antiguedadAgremiacion','Antigüedad en la agremiación','select:Menos de 1 año|1 a 5 años|5 a 10 años|10 a 15 años|Más de 15 años'],['rh','RH','text'],
] as const;
const home = [
  ['clasificacionFamiliar','Clasificación del grupo familiar','text'],['aportesHogar','Quién realiza los aportes en el hogar','text'],['personasCargo','Número de personas a cargo','number'],
  ['ingresosFamiliares','Promedio de ingresos familiares','select:1 salario mínimo legal|2 a 3 S.M.L|4 a 5 S.M.L|Más de 5 S.M.L'],['zonaVivienda','Zona de la vivienda','select:Urbana|Rural|Corregimiento|Vereda|Invasión|Rural dispersa'],
  ['materialParedes','Material de las paredes','text'],['materialPiso','Material del piso','text'],['materialTecho','Material del techo','text'],['tipoVivienda','Tipo de vivienda','select:Independiente|Improvisada|Compartida'],
  ['ocupacionVivienda','Ocupación de la vivienda','select:Propia|Familiar|Alquilada|Comodato|Inquilinato|Cuidado'],['serviciosBasicos','Servicios básicos disponibles','text'],['habitaciones','Número de habitaciones','number'],['mobiliario','Mobiliario de la vivienda','text'],
] as const;
const health = [
  ['usoTiempoLibre','Uso del tiempo libre','text'],['enfermedadDiagnosticada','Enfermedad diagnosticada','text'],['fuma','¿Fuma?','select:No|Sí'],['cigarrillosDia','Promedio al día','number'],
  ['consumeAlcohol','¿Consume bebidas alcohólicas?','select:No|Sí - ocasional|Sí - mensual|Sí - semanal|Sí - diario'],['practicaDeporte','Práctica de deporte','select:No|Sí - ocasional|Sí - mensual|Sí - quincenal|Sí - semanal'],
  ['peso','Peso (kg)','number'],['tallaCm','Talla (cm)','number'],['frecuenciaMedico','Cada cuánto va al médico','select:Semanal|Quincenal|Mensual|Trimestral|Ocasional'],
] as const;

export function isSocioProfileComplete(profile: any) {
  return Boolean(profile?.datosAdicionales?.perfilSociodemograficoCompletado && required.every((key) => String(profile?.[key] ?? profile?.datosAdicionales?.[key] ?? '').trim()));
}

export function TechnicalProfiles({ db, save, session, setSession }: any) {
  const canBrowse = privileged.includes(session.rol);
  const affiliates = db.usuarios.filter((user: any) => user.rol === 'Agremiado');
  const [query, setQuery] = useState('');
  const [targetId, setTargetId] = useState(session.id);
  const target = db.usuarios.find((user: any) => user.id === targetId) || session;
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const base = db.perfiles?.[target.id] || { userId: target.id, documento: '', estadoLaboral: target.activo ? 'ACTIVO' : 'INACTIVO', datosAdicionales:{} };
  const profile = drafts[target.id] || base;
  const extra = profile.datosAdicionales || {};
  const family = Array.isArray(extra.familia) ? extra.familia : [];
  const matches = useMemo(() => { const needle=query.trim().toLowerCase(); return affiliates.filter((user:any)=>!needle||`${user.nombre} ${user.correo} ${db.perfiles?.[user.id]?.documento||''}`.toLowerCase().includes(needle)).slice(0,50)},[affiliates,db.perfiles,query]);
  const updateUser = (patch:any) => setDrafts(current=>({...current,[target.id]:{...profile,__user:{...(profile.__user||target),...patch}}}));
  const update = (field:string,value:any) => setDrafts(current=>({...current,[target.id]:{...profile,[field]:value}}));
  const updateExtra = (field:string,value:any) => setDrafts(current=>({...current,[target.id]:{...profile,datosAdicionales:{...extra,[field]:value}}}));
  const filled = required.filter(key=>String(profile[key] ?? extra[key] ?? '').trim()).length;
  const completion = Math.round(filled/required.length*100);
  const addFamily = () => updateExtra('familia',[...family,{nombre:'',edad:'',parentesco:'',escolaridad:'',ocupacion:''}]);
  const setFamily = (index:number,field:string,value:any) => updateExtra('familia',family.map((person:any,i:number)=>i===index?{...person,[field]:value}:person));
  const removeFamily = (index:number) => updateExtra('familia',family.filter((_:any,i:number)=>i!==index));
  const guardar = () => {
    if (completion < 100) return alert('Complete los datos personales obligatorios antes de continuar.');
    if (!extra.consentimiento) return alert('Debe aceptar el consentimiento de tratamiento de datos.');
    const nextUser=profile.__user||target; const clean={...profile,userId:target.id,datosAdicionales:{...extra,perfilSociodemograficoCompletado:true,fechaActualizacion:new Date().toISOString()}}; delete clean.__user;
    const next={...db,usuarios:db.usuarios.map((u:any)=>u.id===target.id?nextUser:u),perfiles:{...(db.perfiles||{}),[target.id]:clean}};
    save(next,`Perfil sociodemográfico actualizado: ${nextUser.nombre}`); if(target.id===session.id)setSession(nextUser); alert('Perfil sociodemográfico guardado correctamente en Supabase.');
  };
  const userDraft=profile.__user||target;
  return <div className="grid socioProfile">
    {canBrowse&&<div className="card span4"><h3><Search size={18}/> Base de afiliados partícipes</h3><p className="muted">Ficha técnica y caracterización sociodemográfica.</p><input className="input" value={query} placeholder="Nombre, usuario o documento" onChange={e=>setQuery(e.target.value)}/><div className="profileDirectory">{matches.map((u:any)=><button className={`btn ${u.id===target.id?'primary':''}`} key={u.id} onClick={()=>setTargetId(u.id)}><UserRound size={15}/>{u.nombre}</button>)}</div></div>}
    <div className={`card ${canBrowse?'span8':'span12'}`}><div className="row between"><div><span className="welcomeTag">AD-FO-65 · Versión 01</span><h2>Perfil sociodemográfico y familiar</h2><p className="muted">Primer paso obligatorio para habilitar el cargue documental y los demás servicios.</p></div><div className="profileCompletion"><b>{completion}%</b><span>completo</span></div></div><div className="progress"><i style={{width:`${completion}%`}}/></div>
      <Section title="Datos personales"><div className="span6 field"><label>Nombre y apellidos</label><input className="input" value={userDraft.nombre||''} onChange={e=>updateUser({nombre:e.target.value})}/></div><div className="span6 field"><label>Usuario del portal</label><input className="input" value={userDraft.correo||''} onChange={e=>updateUser({correo:e.target.value})}/></div>{personal.map(f=><ProfileField key={f[0]} spec={f} value={profile[f[0]]??extra[f[0]]??''} set={(v:any)=>required.includes(f[0])||f[0] in profile?update(f[0],v):updateExtra(f[0],v)}/>)}</Section>
      <Section title="Información institucional"><div className="span4 field"><label>Entidad</label><select value={userDraft.entidadId||''} onChange={e=>updateUser({entidadId:e.target.value,areaId:''})}><option value="">Seleccione</option>{db.entidades.map((x:any)=><option key={x.id} value={x.id}>{x.nombre}</option>)}</select></div><div className="span4 field"><label>Área o servicio</label><select value={userDraft.areaId||''} onChange={e=>updateUser({areaId:e.target.value})}><option value="">Seleccione</option>{db.areas.filter((x:any)=>x.entidadId===userDraft.entidadId).map((x:any)=><option key={x.id} value={x.id}>{x.nombre}</option>)}</select></div><div className="span4 field"><label>Tipo</label><select value={userDraft.tipo||'Asistencial'} onChange={e=>updateUser({tipo:e.target.value})}><option>Asistencial</option><option>Administrativo</option></select></div>{work.map(f=><ProfileField key={f[0]} spec={f} value={profile[f[0]]??extra[f[0]]??''} set={(v:any)=>f[0] in profile?update(f[0],v):updateExtra(f[0],v)}/>)}</Section>
      <Section title="Composición familiar">{family.map((person:any,index:number)=><div className="familyRow span12" key={index}>{['nombre','edad','parentesco','escolaridad','ocupacion'].map(field=><input key={field} className="input" placeholder={field[0].toUpperCase()+field.slice(1)} value={person[field]||''} onChange={e=>setFamily(index,field,e.target.value)}/>) }<button className="btn" onClick={()=>removeFamily(index)}><Trash2 size={15}/></button></div>)}<div className="span12"><button className="btn" onClick={addFamily}><Plus size={15}/> Agregar integrante</button></div></Section>
      <Section title="Datos de la vivienda">{home.map(f=><ProfileField key={f[0]} spec={f} value={profile[f[0]]??extra[f[0]]??''} set={(v:any)=>f[0] in profile?update(f[0],v):updateExtra(f[0],v)}/>)}</Section>
      <Section title="Salud y estilo de vida">{health.map(f=><ProfileField key={f[0]} spec={f} value={extra[f[0]]??''} set={(v:any)=>updateExtra(f[0],v)}/>)}</Section>
      <label className="signatureConsent"><input type="checkbox" checked={Boolean(extra.consentimiento)} onChange={e=>updateExtra('consentimiento',e.target.checked)}/><span><b>Consentimiento informado</b><small>Autorizo el uso y actualización de esta información conforme a la Ley 1581 de 2012.</small></span></label><button className="btn primary full" onClick={guardar}><Save size={16}/> Guardar y habilitar mi portal</button>
    </div>
  </div>;
}

function Section({title,children}:any){return <section className="socioSection"><h3>{title}</h3><div className="grid">{children}</div></section>}
function ProfileField({spec,value,set}:any){const[field,label,type]=spec;const select=String(type).startsWith('select:');return <div className="span4 field"><label>{label}{required.includes(field)?' *':''}</label>{select?<select value={value} onChange={e=>set(e.target.value)}><option value="">Seleccione…</option>{String(type).slice(7).split('|').map(x=><option key={x}>{x}</option>)}</select>:<input className="input" type={type} value={value} onChange={e=>set(e.target.value)}/>}</div>}
