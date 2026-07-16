const MASTER_FOLDER_ID = '1L6WrnOjq1ui19SQrzWvSqe5rLHKC-b60';
const PAYROLL_SPREADSHEET_ID = '11R2hU9IzD55MBa8FivztC38boeQAxGpoMly_3yH0Ajk';

function doGet() {
  return json_({ ok: true, service: 'AGRESERGE Drive Bridge' });
}

function doPost(e) {
  try {
    const input = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const expected = PropertiesService.getScriptProperties().getProperty('PORTAL_SECRET');
    if (!expected || input.secret !== expected) throw new Error('Acceso no autorizado');
    if (input.action === 'openPeriod') return json_(openPeriod_(input));
    if (input.action === 'consolidate') return json_(consolidate_(input));
    if (input.action === 'lookupPayroll') return json_(lookupPayroll_(input));
    throw new Error('Acción no soportada');
  } catch (error) {
    return json_({ ok: false, error: String(error.message || error) });
  }
}

function lookupPayroll_(input) {
  const document = String(input.documento || '').replace(/\D/g, '');
  if (!document) throw new Error('Documento requerido');
  const spreadsheet = SpreadsheetApp.openById(PAYROLL_SPREADSHEET_ID);
  const tabNames = ['ADMINISTRATIVO', 'SERV GEN Y MANTENIMIENTO', 'ASISTENCIAL'];
  for (let s = 0; s < tabNames.length; s++) {
    const sheet = spreadsheet.getSheetByName(tabNames[s]);
    if (!sheet) continue;
    const rows = sheet.getDataRange().getDisplayValues();
    const headerIndex = rows.findIndex(function (row) { return row.some(function (cell) { return String(cell).trim().toUpperCase() === 'CEDULA'; }); });
    if (headerIndex < 0) continue;
    const headers = rows[headerIndex].map(function (value) { return String(value).trim(); });
    const documentIndex = headers.findIndex(function (value) { return value.toUpperCase() === 'CEDULA'; });
    const match = rows.slice(headerIndex + 1).find(function (row) { return String(row[documentIndex] || '').replace(/\D/g, '') === document; });
    if (!match) continue;
    const record = {};
    headers.forEach(function (header, index) { record[header || ('CAMPO_' + (index + 1))] = match[index] || ''; });
    const get = function () { for (let i = 0; i < arguments.length; i++) if (record[arguments[i]] !== undefined) return record[arguments[i]]; return ''; };
    const money = function (value) { return Number(String(value || '').replace(/[^0-9-]/g, '') || 0); };
    return { ok: true, tab: tabNames[s], payroll: {
      documento: document,
      nombre: get('NOMBRE AFILIADO PARTICIPE'),
      cargo: get('CARGO', 'PROCESO', 'SERVICIO'),
      area: get('AREA', 'CENTRO DE COSTOS'),
      centroCostos: get('CENTRO DE COSTOS'),
      dias: get('DIAS COMPENSADOS'),
      ordinaria: money(get('COMPENSACION ORDINARIA')),
      otras: money(get('OTRAS COMPENSACIONES ')),
      transporte: money(get('COMPENSACION POR TRANSPORTE')),
      salud: money(get('SALUD')),
      pension: money(get('PENSION')),
      arl: money(get('ARL')),
      retencion: money(get('RETEFUENTE')),
      otrosDescuentos: money(get('OTROS DESCUENTOS', 'VALOR DESCUENTO')),
      adicionales: money(get('TRIAGE/VALOR ADICIONAL', 'VALOR ADICIONAL')),
      totalRecibido: money(get('VALOR RECIBIDO MES')),
      totalProceso: money(get('Valor total Mes Proceso 2026')),
      observaciones: get('OBSERVACIONES', 'Observaciones')
    }};
  }
  throw new Error('No se encontró nómina para ese documento');
}

function openPeriod_(input) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const root = DriveApp.getFolderById(MASTER_FOLDER_ID);
    const periods = childFolder_(root, 'PERIODOS GENERADOS');
    const year = childFolder_(periods, String(input.anio));
    const month = childFolder_(year, String(input.mes).toUpperCase());
    const items = (input.assignments || []).map(function (assignment) {
      const template = templateByNumber_(root, assignment.anexo);
      const safeName = String(assignment.responsableNombre || 'RESPONSABLE').replace(/[\\/:*?"<>|]/g, '-');
      const title = String(input.anio) + '-' + String(input.mes).toUpperCase() + ' - FORMATO #' + assignment.anexo + ' - ' + safeName;
      const existing = filesByName_(month, title);
      const copy = existing.length ? existing[0] : template.makeCopy(title, month);
      return { anexo: assignment.anexo, responsableId: assignment.responsableId, nombre: title, id: copy.getId(), url: copy.getUrl() };
    });
    return { ok: true, folderId: month.getId(), folderUrl: month.getUrl(), items: items };
  } finally {
    lock.releaseLock();
  }
}

function consolidate_(input) {
  const root = DriveApp.getFolderById(MASTER_FOLDER_ID);
  const periods = childFolder_(root, 'PERIODOS GENERADOS');
  const year = childFolder_(periods, String(input.anio));
  const month = childFolder_(year, String(input.mes).toUpperCase());
  const name = 'INFORME FINAL - ' + String(input.mes).toUpperCase() + ' ' + input.anio;
  const old = filesByName_(month, name);
  if (old.length) return { ok: true, id: old[0].getId(), url: old[0].getUrl() };
  const doc = DocumentApp.create(name);
  const body = doc.getBody();
  body.appendParagraph('PORTAL INSTITUCIONAL AGRESERGE').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Informe mensual consolidado: ' + input.mes + ' ' + input.anio);
  body.appendTable([['Formato', 'Responsable', 'Estado', 'Enlace']].concat((input.items || []).map(function (item) {
    return ['#' + item.anexo, item.responsableNombre || '', item.estado || '', item.url || ''];
  })));
  doc.saveAndClose();
  const file = DriveApp.getFileById(doc.getId());
  file.moveTo(month);
  return { ok: true, id: file.getId(), url: file.getUrl() };
}

function templateByNumber_(folder, number) {
  const pattern = new RegExp('#' + Number(number) + '(?:\\D|$)');
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (pattern.test(file.getName())) return file;
  }
  throw new Error('No se encontró la plantilla #' + number);
}

function childFolder_(parent, name) {
  const found = parent.getFoldersByName(name);
  return found.hasNext() ? found.next() : parent.createFolder(name);
}

function filesByName_(folder, name) {
  const found = folder.getFilesByName(name), result = [];
  while (found.hasNext()) result.push(found.next());
  return result;
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
