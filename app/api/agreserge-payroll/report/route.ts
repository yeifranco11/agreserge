import { NextResponse } from 'next/server';
import { getSessionUserId } from '../../../../lib/agreserge-auth';
import { loadDB } from '../../../../lib/agreserge-db';
import { loadPublicPayroll } from '../../../../lib/public-payroll';

const managers = ['Administrador de Sistemas','Coordinadora','Coordinación AGRESERGE','Coordinación General','Coordinación Administrativa','Coordinador de Sede','Tesorería','Coordinadora Administrativa y Financiera','Coordinador General','Gerente'];
const aggregate = (rows:any[], field:string) => Object.entries(rows.reduce((acc:any,row:any)=>{const key=row[field]||'Sin registrar';const item=acc[key]||{grupo:key,personas:0,totalRecibido:0,totalProceso:0};item.personas++;item.totalRecibido+=row.totalRecibido||0;item.totalProceso+=row.totalProceso||0;acc[key]=item;return acc},{})).map(([,value])=>value).sort((a:any,b:any)=>b.totalProceso-a.totalProceso);

export async function GET() {
  try {
    const userId=await getSessionUserId(); if(!userId)return NextResponse.json({error:'Sesión requerida'},{status:401});
    const db=await loadDB(); const actor=db.usuarios.find((u:any)=>u.id===userId&&u.activo);
    if(!actor||!managers.includes(actor.rol))return NextResponse.json({error:'Perfil no autorizado para informes de nómina'},{status:403});
    const rows=await loadPublicPayroll();
    const totals=rows.reduce((acc:any,row:any)=>{acc.personas++;acc.ordinaria+=row.ordinaria||0;acc.totalRecibido+=row.totalRecibido||0;acc.totalProceso+=row.totalProceso||0;return acc},{personas:0,ordinaria:0,totalRecibido:0,totalProceso:0});
    return NextResponse.json({ok:true,totals,porArea:aggregate(rows,'area'),porCargo:aggregate(rows,'cargo'),porHospital:aggregate(rows,'tab'),rows,updatedAt:new Date().toISOString()});
  } catch(error:any){return NextResponse.json({error:error.message||'No se pudo generar el informe de nómina'},{status:500})}
}
