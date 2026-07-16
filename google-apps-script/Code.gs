const MASTER_FOLDER_ID = '1L6WrnOjq1ui19SQrzWvSqe5rLHKC-b60';

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
    throw new Error('Acción no soportada');
  } catch (error) {
    return json_({ ok: false, error: String(error.message || error) });
  }
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
