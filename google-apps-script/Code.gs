const MASTER_FOLDER_ID = '1L6WrnOjq1ui19SQrzWvSqe5rLHKC-b60';
const PAYROLL_SPREADSHEET_ID = '11R2hU9IzD55MBa8FivztC38boeQAxGpoMly_3yH0Ajk';
const CERTIFICATES_SPREADSHEET_ID = '18C_XksYLi9wjhYLsTK_eZtQ2_LnaGrevlsJ4Y8lU7J4';

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
    if (input.action === 'importReportFile') return json_(importReportFile_(input));
    if (input.action === 'importReportFromUrl') return json_(importReportFromUrl_(input));
    if (input.action === 'createSubreport') return json_(createSubreport_(input));
    if (input.action === 'resetPeriods') return json_(resetPeriods_(input));
    if (input.action === 'lookupPayroll') return json_(lookupPayroll_(input));
    if (input.action === 'certificateTracking') return json_(certificateTracking_(input));
    throw new Error('Acción no soportada');
  } catch (error) {
    return json_({ ok: false, error: String(error.message || error) });
  }
}

function certificateTracking_(input) {
  const warningDays = Math.max(1, Math.min(365, Number(input.days || 60)));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const book = SpreadsheetApp.openById(CERTIFICATES_SPREADSHEET_ID);
  const affiliates = [];
  book.getSheets().forEach(function(sheet) {
    if (sheet.isSheetHidden() || sheet.getLastRow() < 2) return;
    const values = sheet.getDataRange().getValues();
    const display = sheet.getDataRange().getDisplayValues();
    const headerRow = findCertificateHeaderRow_(display);
    if (headerRow < 0) return;
    const headers = display[headerRow].map(function(v) { return cleanText_(v); });
    const documentIndex = findHeader_(headers, ['CEDULA', 'CÉDULA', 'DOCUMENTO', 'NUMERO DE DOCUMENTO', 'NÚMERO DE DOCUMENTO', 'IDENTIFICACION', 'IDENTIFICACIÓN']);
    const nameIndex = findHeader_(headers, ['NOMBRE', 'NOMBRES Y APELLIDOS', 'NOMBRE COMPLETO', 'AGREMIADO', 'AFILIADO PARTICIPE', 'AFILIADO PARTÍCIPE']);
    const areaIndex = findHeader_(headers, ['AREA', 'ÁREA', 'SERVICIO', 'AREA O SERVICIO', 'ÁREA O SERVICIO', 'CARGO', 'PROCESO']);
    const hospitalIndex = findHeader_(headers, ['HOSPITAL', 'ENTIDAD', 'EMPRESA']);
    const phoneIndex = headers.findIndex(function(h) { return /TELEFONO|TELÉFONO|CELULAR|WHATSAPP/.test(h); });
    for (let r = headerRow + 1; r < display.length; r++) {
      const row = display[r];
      const document = digits_(documentIndex >= 0 ? row[documentIndex] : row[1]);
      const name = String(nameIndex >= 0 ? row[nameIndex] : row[2] || '').trim();
      if (!document && !name) continue;
      const certificates = [];
      for (let c = 7; c <= 20; c++) {
        const course = String(headers[c] || ('CURSO ' + columnName_(c + 1))).trim();
        const rawDisplay = String(row[c] || '').trim();
        const result = certificateStatus_(values[r][c], rawDisplay, today, warningDays);
        certificates.push({ course: course, value: rawDisplay, status: result.status, expiresAt: result.expiresAt, daysRemaining: result.daysRemaining });
      }
      affiliates.push({
        sheet: sheet.getName(), entity: String(hospitalIndex >= 0 ? row[hospitalIndex] : sheet.getName()).trim() || sheet.getName(),
        document: document, name: name, area: String(areaIndex >= 0 ? row[areaIndex] : '').trim(),
        phone: digits_(phoneIndex >= 0 ? row[phoneIndex] : row[33]), certificates: certificates
      });
    }
  });
  return { ok: true, sourceUpdatedAt: new Date().toISOString(), warningDays: warningDays, affiliates: affiliates };
}

function findCertificateHeaderRow_(rows) {
  const limit = Math.min(rows.length, 12);
  for (let r = 0; r < limit; r++) {
    let courseHeaders = 0;
    for (let c = 7; c <= 20; c++) if (String(rows[r][c] || '').trim()) courseHeaders++;
    if (courseHeaders >= 4) return r;
  }
  return -1;
}
function cleanText_(value) { return String(value || '').trim().toUpperCase().replace(/\s+/g, ' '); }
function findHeader_(headers, candidates) {
  for (let i = 0; i < candidates.length; i++) {
    const target = cleanText_(candidates[i]);
    const exact = headers.indexOf(target); if (exact >= 0) return exact;
  }
  for (let h = 0; h < headers.length; h++) for (let i = 0; i < candidates.length; i++) if (headers[h].indexOf(cleanText_(candidates[i])) >= 0) return h;
  return -1;
}
function digits_(value) { return String(value || '').replace(/\D/g, ''); }
function columnName_(number) { let name = ''; while (number) { number--; name = String.fromCharCode(65 + number % 26) + name; number = Math.floor(number / 26); } return name; }
function certificateStatus_(raw, shown, today, warningDays) {
  const text = cleanText_(shown);
  if (!text || text === 'NO' || text === 'PENDIENTE') return { status: 'PENDIENTE', expiresAt: null, daysRemaining: null };
  if (/^(N\/?A|NO APLICA|NO APLICABLE)$/.test(text)) return { status: 'NO_APLICA', expiresAt: null, daysRemaining: null };
  let date = raw instanceof Date && !isNaN(raw.getTime()) ? new Date(raw.getTime()) : parseCertificateDate_(shown);
  if (!date) return { status: 'PENDIENTE', expiresAt: null, daysRemaining: null };
  date.setHours(0, 0, 0, 0);
  const days = Math.round((date.getTime() - today.getTime()) / 86400000);
  const iso = Utilities.formatDate(date, Session.getScriptTimeZone() || 'America/Bogota', 'yyyy-MM-dd');
  return { status: days < 0 ? 'VENCIDO' : days <= warningDays ? 'PROXIMO' : 'VIGENTE', expiresAt: iso, daysRemaining: days };
}
function parseCertificateDate_(value) {
  const text = String(value || '').trim();
  let match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!match && /^\d{8}$/.test(text)) match = [text, text.slice(0,2), text.slice(2,4), text.slice(4)];
  if (!match) return null;
  const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  return date.getFullYear() === Number(match[3]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[1]) ? date : null;
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
    const hospital = childFolder_(periods, safe_(String(input.hospital || 'HOSPITAL').toUpperCase()));
    const year = childFolder_(hospital, String(input.anio));
    const month = childFolder_(year, String(input.mes).toUpperCase());
    const obligationFolders = {};

    (input.obligations || []).sort(function(a, b) {
      return Number(a.obligacion) - Number(b.obligacion);
    }).forEach(function(obligation) {
      const number = Number(obligation.obligacion);
      const folder = childFolder_(
        month,
        String(number).padStart(2, '0') + ' - ' + safe_(obligation.titulo || ('OBLIGACIÓN ' + number))
      );
      obligationFolders[number] = folder;
      const coverFolder = childFolder_(folder, '00 - PORTADA DE LA OBLIGACIÓN');
      cleanupGeneratedDocs_(coverFolder);
    });

    const items = (input.assignments || []).map(function (assignment) {
      const obligationNumber = Number(assignment.obligacion);
      const obligation = obligationFolders[obligationNumber] || childFolder_(
        month,
        String(obligationNumber).padStart(2, '0') + ' - OBLIGACIÓN ' + obligationNumber
      );
      const isDirectSupport = Number(assignment.anexo) === 0;
      const annex = childFolder_(
        obligation,
        isDirectSupport
          ? '01 - SOPORTE DIRECTO DE LA OBLIGACIÓN'
          : 'ANEXO ' + String(assignment.anexo).padStart(2, '0') + ' - ' + safe_(assignment.titulo || 'INFORME')
      );
      const safeName = String(assignment.responsableNombre || 'RESPONSABLE').replace(/[\\/:*?"<>|]/g, '-');
      const title = isDirectSupport
        ? String(input.anio) + '-' + String(input.mes).toUpperCase() + ' - SOPORTE OBLIGACIÓN ' + obligationNumber + ' - ' + safeName
        : String(input.anio) + '-' + String(input.mes).toUpperCase() + ' - ANEXO ' + assignment.anexo + ' - ' + safeName;
      cleanupGeneratedDocs_(annex);
      const subitems = (assignment.subinformes || []).sort(function(a,b){ return Number(a.orden)-Number(b.orden); }).map(function(sub) {
        const subFolder = childFolder_(annex, String(sub.orden).padStart(2, '0') + ' - ' + safe_(sub.titulo));
        const subTitle = title + ' - ' + safe_(sub.responsableNombre);
        cleanupGeneratedDocs_(subFolder);
        return { responsableId: sub.responsableId, nombre: subTitle, id: null, url: null, folderId: subFolder.getId(), folderUrl: subFolder.getUrl(), orden: sub.orden };
      });
      return { obligacion: assignment.obligacion, anexo: assignment.anexo, responsableId: assignment.responsableId, nombre: title, id: null, url: null, folderId: annex.getId(), folderUrl: annex.getUrl(), subitems: subitems };
    });
    return { ok: true, folderId: month.getId(), folderUrl: month.getUrl(), items: items };
  } finally {
    lock.releaseLock();
  }
}

function consolidate_(input) {
  const root = DriveApp.getFolderById(MASTER_FOLDER_ID);
  const periods = childFolder_(root, 'PERIODOS GENERADOS');
  const hospital = childFolder_(periods, safe_(String(input.hospital || 'HOSPITAL').toUpperCase()));
  const year = childFolder_(hospital, String(input.anio));
  const month = childFolder_(year, String(input.mes).toUpperCase());
  const name = 'INFORME DE EJECUCIÓN - ' + safe_(input.hospital || '') + ' - ' + String(input.mes).toUpperCase() + ' ' + input.anio;
  const old = filesByName_(month, name);
  old.forEach(function(file) { file.setTrashed(true); });
  const annexPdfs = childFolder_(month, 'PDF CONSOLIDADO POR ANEXO');
  const oldPdfs = annexPdfs.getFiles();
  while (oldPdfs.hasNext()) oldPdfs.next().setTrashed(true);
  const doc = DocumentApp.create(name);
  const body = doc.getBody();
  body.appendParagraph('ASOCIACIÓN GREMIAL SINDICAL DE PRESTACIONES DE SERVICIOS GENERALES Y DE SALUD DEL VALLE').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('INFORME DE EJECUCIÓN DE ACTIVIDADES').setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph(String(input.hospital || '') + ' · ' + input.mes + ' ' + input.anio);
  let lastObligation = null;
  (input.items || []).sort(function(a,b){ return Number(a.orden)-Number(b.orden); }).forEach(function(item) {
    if (lastObligation !== item.obligacion) {
      body.appendPageBreak();
      body.appendParagraph('OBLIGACIÓN CONTRACTUAL ' + item.obligacion).setHeading(DocumentApp.ParagraphHeading.HEADING1);
      body.appendParagraph(item.obligacionTitulo || '');
      lastObligation = item.obligacion;
    }
    body.appendParagraph(
      Number(item.anexo) === 0
        ? 'SOPORTE DIRECTO DE LA OBLIGACIÓN · ' + (item.titulo || '')
        : 'ANEXO ' + (item.anexo || 'S/A') + ' · ' + (item.titulo || '')
    ).setHeading(DocumentApp.ParagraphHeading.HEADING2);
    const principalFiles = item.urls && item.urls.length ? item.urls : (item.url ? [{ nombre: 'Archivo principal', url: item.url }] : []);
    if (!principalFiles.length) body.appendParagraph('Sin archivo cargado');
    principalFiles.forEach(function(support, index) {
      const link = body.appendParagraph((index + 1) + '. ' + (support.nombre || support.url));
      if (support.url) link.setLinkUrl(support.url);
    });
    (item.subitems || []).sort(function(a,b){ return Number(a.orden)-Number(b.orden); }).forEach(function(sub) {
      body.appendParagraph(sub.orden + '. ' + sub.titulo + ' · ' + (sub.responsableNombre || '')).setHeading(DocumentApp.ParagraphHeading.HEADING3);
      const subFiles = sub.urls && sub.urls.length ? sub.urls : (sub.url ? [{ nombre: 'Archivo', url: sub.url }] : []);
      if (!subFiles.length) body.appendParagraph('Pendiente');
      subFiles.forEach(function(support, index) {
        const subLink = body.appendParagraph((index + 1) + '. ' + (support.nombre || support.url));
        if (support.url) subLink.setLinkUrl(support.url);
      });
    });
  });
  doc.saveAndClose();
  const file = DriveApp.getFileById(doc.getId());
  file.moveTo(month);
  (input.items || []).sort(function(a,b){ return Number(a.orden)-Number(b.orden); }).forEach(function(item) {
    const annexLabel = Number(item.anexo) === 0
      ? 'SOPORTE OBLIGACIÓN ' + item.obligacion
      : (Number(item.anexo) === 16 && /16 y 17/i.test(String(item.titulo || '')))
        ? 'ANEXO 16 Y 17'
        : 'ANEXO ' + item.anexo;
    const annexName = String(item.obligacion).padStart(2, '0') + ' - ' + annexLabel + ' - ' + safe_(item.titulo || '');
    const annexDoc = DocumentApp.create(annexName);
    const annexBody = annexDoc.getBody();
    annexBody.appendParagraph('AGRESERGE DEL VALLE').setHeading(DocumentApp.ParagraphHeading.HEADING1);
    annexBody.appendParagraph('INFORME DE EJECUCIÓN DE ACTIVIDADES').setHeading(DocumentApp.ParagraphHeading.TITLE);
    annexBody.appendParagraph(String(input.hospital || '') + ' · ' + String(input.mes).toUpperCase() + ' ' + input.anio);
    annexBody.appendHorizontalRule();
    annexBody.appendParagraph('OBLIGACIÓN CONTRACTUAL ' + item.obligacion).setHeading(DocumentApp.ParagraphHeading.HEADING1);
    annexBody.appendParagraph(item.obligacionTitulo || '');
    annexBody.appendParagraph(annexLabel + ' · ' + (item.titulo || '')).setHeading(DocumentApp.ParagraphHeading.HEADING2);
    annexBody.appendParagraph('Responsable: ' + (item.responsableNombre || 'Sin asignar'));
    const annexFiles = item.urls && item.urls.length ? item.urls : (item.url ? [{ nombre: 'Archivo principal', url: item.url }] : []);
    if (!annexFiles.length) annexBody.appendParagraph('Sin archivo principal cargado');
    annexFiles.forEach(function(support, index) {
      const principal = annexBody.appendParagraph((index + 1) + '. ' + (support.nombre || support.url));
      if (support.url) principal.setLinkUrl(support.url);
    });
    (item.subitems || []).sort(function(a,b){ return Number(a.orden)-Number(b.orden); }).forEach(function(sub, index) {
      annexBody.appendParagraph((index + 1) + '. ' + sub.titulo).setHeading(DocumentApp.ParagraphHeading.HEADING3);
      annexBody.appendParagraph('Responsable: ' + (sub.responsableNombre || 'Sin asignar'));
      const subFiles = sub.urls && sub.urls.length ? sub.urls : (sub.url ? [{ nombre: 'Archivo', url: sub.url }] : []);
      if (!subFiles.length) annexBody.appendParagraph('Pendiente de cargue');
      subFiles.forEach(function(fileData, fileIndex) {
        const support = annexBody.appendParagraph((fileIndex + 1) + '. ' + (fileData.nombre || fileData.url));
        if (fileData.url) support.setLinkUrl(fileData.url);
      });
    });
    annexDoc.saveAndClose();
    const annexFile = DriveApp.getFileById(annexDoc.getId());
    const pdf = annexFile.getAs(MimeType.PDF).setName(annexName + '.pdf');
    annexPdfs.createFile(pdf);
    annexFile.setTrashed(true);
  });
  return {
    ok: true,
    id: file.getId(),
    url: file.getUrl(),
    wordUrl: 'https://docs.google.com/document/d/' + file.getId() + '/export?format=docx',
    pdfFolderUrl: annexPdfs.getUrl()
  };
}

function importReportFile_(input) {
  if (!input.folderId || !input.fileBase64 || !input.fileName) throw new Error('Archivo y carpeta son obligatorios');
  const bytes = Utilities.base64Decode(input.fileBase64);
  const blob = Utilities.newBlob(bytes, input.mimeType || 'application/octet-stream', safe_(input.fileName));
  if (input.mimeType) blob.setContentType(input.mimeType);
  const file = DriveApp.getFolderById(input.folderId).createFile(blob);
  return { ok: true, id: file.getId(), url: file.getUrl(), name: file.getName() };
}

function importReportFromUrl_(input) {
  if (!input.folderId || !input.fileUrl || !input.fileName) throw new Error('Archivo y carpeta son obligatorios');
  const response = UrlFetchApp.fetch(input.fileUrl, { muteHttpExceptions: true });
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) throw new Error('No se pudo descargar el archivo temporal: HTTP ' + status);
  const blob = response.getBlob().setName(safe_(input.fileName));
  if (input.mimeType) blob.setContentType(input.mimeType);
  const file = DriveApp.getFolderById(input.folderId).createFile(blob);
  return { ok: true, id: file.getId(), url: file.getUrl(), name: file.getName() };
}

function createSubreport_(input) {
  if (!input.folderId || !input.title) throw new Error('Carpeta y nombre del subinforme son obligatorios');
  const parent = DriveApp.getFolderById(input.folderId);
  const order = Math.max(1, Number(input.order || 1));
  const title = safe_(input.title);
  const responsible = safe_(input.responsibleName || 'RESPONSABLE');
  const folder = childFolder_(parent, String(order).padStart(2, '0') + ' - ' + title);
  const documentTitle = title + ' - ' + responsible;
  return {
    ok: true,
    id: null,
    url: null,
    folderId: folder.getId(),
    folderUrl: folder.getUrl(),
    name: documentTitle
  };
}

function cleanupGeneratedDocs_(folder) {
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (file.getMimeType() !== MimeType.GOOGLE_DOCS) continue;
    const name = file.getName();
    if (/^\d{4}-.+ - (ANEXO|SOPORTE OBLIGACIÓN) \d+ - /i.test(name) ||
        /^\d{2} - ACTIVIDAD CONTRATADA - PORTADA$/i.test(name)) {
      file.setTrashed(true);
    }
  }
}

function authorizeExternalRequest() {
  UrlFetchApp.fetch('https://www.google.com/generate_204', { muteHttpExceptions: true });
}

function resetPeriods_() {
  const root = DriveApp.getFolderById(MASTER_FOLDER_ID);
  const folders = root.getFoldersByName('PERIODOS GENERADOS');
  let archived = 0;
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Bogota', 'yyyy-MM-dd HH-mm-ss');
  while (folders.hasNext()) {
    folders.next().setName('HISTÓRICO REINICIADO - ' + stamp + (archived ? ' - ' + (archived + 1) : ''));
    archived += 1;
  }
  childFolder_(root, 'PERIODOS GENERADOS');
  return { ok: true, archived: archived };
}

function createDocIn_(folder, title, subtitle) {
  const existing = filesByName_(folder, title);
  if (existing.length) return existing[0];
  const doc = DocumentApp.create(title);
  doc.getBody().appendParagraph(title).setHeading(DocumentApp.ParagraphHeading.TITLE);
  if (subtitle) doc.getBody().appendParagraph(subtitle);
  doc.saveAndClose();
  const file = DriveApp.getFileById(doc.getId());
  file.moveTo(folder);
  return file;
}

function safe_(value) {
  return String(value || '').replace(/[\\/:*?"<>|]/g, '-').trim();
}

function activityTemplateByNumber_(folder, number) {
  const pattern = new RegExp('ACTIVIDADES\\s+CONTRATADAS\\s*#\\s*' + Number(number) + '(?:\\D|$)', 'i');
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (pattern.test(file.getName())) return file;
  }
  throw new Error('No se encontró la portada de la obligación #' + number);
}

function annexTemplate_(folder) {
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName().toUpperCase();
    if (name.indexOf('AD-FO-06') >= 0 && name.indexOf('INFORME') >= 0) return file;
  }
  throw new Error('No se encontró la plantilla maestra AD-FO-06-INFORME');
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
