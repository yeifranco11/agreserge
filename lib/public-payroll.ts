const SPREADSHEET_ID = '11R2hU9IzD55MBa8FivztC38boeQAxGpoMly_3yH0Ajk';
const TABS = ['ADMINISTRATIVO', 'SERV GEN Y MANTENIMIENTO', 'ASISTENCIAL'];
const TAB_HEADERS: Record<string, string[]> = {
  ADMINISTRATIVO: ['No','CEDULA','NOMBRE AFILIADO PARTICIPE','PROCESO','CENTRO DE COSTOS','DIAS COMPENSADOS','COMPENSACION ORDINARIA','OTRAS COMPENSACIONES','COMPENSACION POR TRANSPORTE','SALUD','PENSION','ARL','PARAFISCALES','BIENESTAR SOCIAL','VALOR DESCUENTO','VALOR ADICIONAL','VALOR RECIBIDO MES','PRIMA','CESANTIAS','INT CESANTIAS','VACACIONES','Costo proceso 2026','AIU 13,06%','IVA 19% SOBRE AIU','Valor total Mes Proceso 2026','Observaciones'],
  'SERV GEN Y MANTENIMIENTO': ['No','CEDULA','NOMBRE AFILIADO PARTICIPE','SERVICIO','AREA','CENTRO DE COSTOS','DIAS COMPENSADOS','COMPENSACION ORDINARIA','OTRAS COMPENSACIONES','COMPENSACION POR TRANSPORTE','SALUD','PENSION','ARL','PARAFISCALES','BIENESTAR SOCIAL','VALOR DESCUENTO','VALOR ADICIONAL','VALOR RECIBIDO MES','PRIMA','CESANTIAS','INT CESANTIAS','VACACIONES','Costo proceso 2026','AIU 13,06%','IVA 19% SOBRE AIU','Valor total Mes Proceso 2026','Observaciones'],
  ASISTENCIAL: ['No','CEDULA','NOMBRE AFILIADO PARTICIPE','CARGO','AREA','CENTRO DE COSTOS','SUBCENTRO DE COSTOS','DIAS COMPENSADOS','COMPENSACION ORDINARIA','OTRAS COMPENSACIONES','COMPENSACION POR TRANSPORTE','SALUD','PENSION','ARL','PARAFISCALES','BIENESTAR SOCIAL','RETEFUENTE','OTROS DESCUENTOS','TRIAGE/VALOR ADICIONAL','VALOR RECIBIDO MES','PRIMA','CESANTIAS','INT CESANTIAS','VACACIONES','Costo proceso 2026','AIU 13,06%','IVA 19% SOBRE AIU','Valor total Mes Proceso 2026','OBSERVACIONES'],
};

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') { cell += '"'; index++; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index++;
      row.push(cell); if (row.some(Boolean)) rows.push(row); row = []; cell = '';
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const normalize = (value:string) => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
const number = (value: string) => {
  let clean=String(value||'').replace(/[^0-9,.-]/g,''); if(!clean)return 0;
  if(clean.includes(',')) clean=clean.replace(/\./g,'').replace(',','.');
  else if(/^[-]?\d{1,3}(\.\d{3})+$/.test(clean)) clean=clean.replace(/\./g,'');
  return Math.round(Number(clean)||0);
};

function payrollFromRow(match: string[], headers: string[], tab: string) {
  const record=Object.fromEntries(headers.map((header,index)=>[normalize(header),match[index]||'']));
  const get=(...names:string[])=>{for(const name of names){const value=record[normalize(name)];if(value!==undefined)return value}return ''};
  return {
    documento:String(get('CEDULA')).replace(/\D/g,''),nombre:get('NOMBRE AFILIADO PARTICIPE'),cargo:get('CARGO','PROCESO','SERVICIO'),area:get('AREA','CENTRO DE COSTOS')||tab,
    centroCostos:get('CENTRO DE COSTOS'),subcentroCostos:get('SUBCENTRO DE COSTOS'),dias:get('DIAS COMPENSADOS'),
    ordinaria:number(get('COMPENSACION ORDINARIA')),otras:number(get('OTRAS COMPENSACIONES')),transporte:number(get('COMPENSACION POR TRANSPORTE')),
    salud:number(get('SALUD','EPS')),pension:number(get('PENSION','PENSIONES')),arl:number(get('ARL')),retencion:number(get('RETEFUENTE')),
    otrosDescuentos:number(get('OTROS DESCUENTOS','VALOR DESCUENTO')),adicionales:number(get('TRIAGE/VALOR ADICIONAL','VALOR ADICIONAL')),
    totalRecibido:number(get('VALOR RECIBIDO MES')),costoProceso:number(get('COSTO PROCESO 2026')),totalProceso:number(get('VALOR TOTAL MES PROCESO 2026')),
    parafiscales:number(get('PARAFISCALES')),bienestar:number(get('BIENESTAR SOCIAL')),prima:number(get('PRIMA')),cesantias:number(get('CESANTIAS')),interesesCesantias:number(get('INT CESANTIAS')),vacaciones:number(get('VACACIONES')),aiu:number(get('AIU 13,06%')),iva:number(get('IVA 19% SOBRE AIU')),observaciones:get('OBSERVACIONES'),tab,
  };
}

export async function lookupPayrollInPublicSheet(documento: string) {
  for (const tab of TABS) {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
    if (!response.ok) continue;
    const rows = parseCsv(await response.text());
    const headerIndex=rows.findIndex(row=>row.some(cell=>normalize(cell)==='NOMBRE AFILIADO PARTICIPE'));if(headerIndex<0)continue;const headers=TAB_HEADERS[tab];const documentIndex=1;
    const match = rows.slice(headerIndex+1).find(row => String(row[documentIndex] || '').replace(/\D/g, '') === documento);
    if (!match) continue;
    return { tab, payroll: payrollFromRow(match, headers, tab) };
  }
  throw new Error('No se encontró nómina para ese documento en las hojas ADMINISTRATIVO, SERV GEN Y MANTENIMIENTO o ASISTENCIAL.');
}

export async function loadPublicPayroll() {
  const result: any[] = [];
  for (const tab of TABS) {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`No fue posible leer la pestaña ${tab}`);
    const rows=parseCsv(await response.text());const headerIndex=rows.findIndex(row=>row.some(cell=>normalize(cell)==='NOMBRE AFILIADO PARTICIPE'));if(headerIndex<0)continue;const headers=TAB_HEADERS[tab];const documentIndex=1;
    for (const row of rows.slice(headerIndex+1)) if (/^\d{5,12}$/.test(String(row[documentIndex] || '').replace(/\D/g, ''))) result.push(payrollFromRow(row,headers,tab));
  }
  return result;
}
