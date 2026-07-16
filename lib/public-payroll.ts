const SPREADSHEET_ID = '11R2hU9IzD55MBa8FivztC38boeQAxGpoMly_3yH0Ajk';
const TABS = ['ADMINISTRATIVO', 'SERV GEN Y MANTENIMIENTO', 'ASISTENCIAL'];

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

const number = (value: string) => Number(String(value || '').replace(/[^0-9-]/g, '') || 0);

export async function lookupPayrollInPublicSheet(documento: string) {
  for (const tab of TABS) {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
    if (!response.ok) continue;
    const rows = parseCsv(await response.text());
    const match = rows.find(row => String(row[1] || '').replace(/\D/g, '') === documento);
    if (!match) continue;
    return { tab, payroll: {
      documento, nombre: match[2] || '', cargo: match[3] || '', area: match[4] || tab,
      centroCostos: match[5] || '', dias: match[7] || '', ordinaria: number(match[8]),
      otras: 0, transporte: number(match[18]), salud: number(match[11]), pension: number(match[12]),
      arl: number(match[13]), retencion: number(match[16]), otrosDescuentos: 0, adicionales: 0,
      totalRecibido: number(match[19]), totalProceso: number(match[27] || match[24]), observaciones: match[28] || '',
    }};
  }
  throw new Error('No se encontró nómina para ese documento en las hojas ADMINISTRATIVO, SERV GEN Y MANTENIMIENTO o ASISTENCIAL.');
}
