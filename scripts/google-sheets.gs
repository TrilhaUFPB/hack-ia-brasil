/**
 * Receives applications from /api/inscricao and appends one row per application.
 *
 * Setup (once):
 * 1. Create a Google Sheet. Extensions → Apps Script, paste this file.
 * 2. Project Settings → Script properties → add SECRET with a long random value.
 * 3. Deploy → New deployment → Web app. Execute as: Me. Who has access: Anyone.
 * 4. In Vercel, set SHEETS_WEBHOOK_URL (the web app URL) and SHEETS_SECRET (same value as step 2).
 *
 * Columns are created from the field names on first use, so new fields show up on their own.
 */
function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  if (body.secret !== PropertiesService.getScriptProperties().getProperty("SECRET")) {
    return json({ ok: false, error: "unauthorized" });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var row = body.row;
    var headers = sheet.getLastColumn() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
    var missing = Object.keys(row).filter(function (k) { return headers.indexOf(k) === -1; });
    if (missing.length) {
      headers = headers.concat(missing);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow(headers.map(function (h) { return h in row ? row[h] : ""; }));
  } finally {
    lock.releaseLock();
  }
  return json({ ok: true });
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Guardian consent, sent only to approved applications.
 *
 * Setup: add a script property TERMO_URL with a link to the consent form (participation + image use),
 * e.g. a PDF in Google Drive shared as "anyone with the link can view".
 * Use: type "aprovado" in the `status` column of the approved rows, then
 * menu Hack IA → "Enviar termos aos responsáveis". Rows already sent get a date in `termos_enviados_em`
 * and are skipped next time, so the menu can be run again after each round of approvals.
 */
function onOpen() {
  SpreadsheetApp.getUi().createMenu("Hack IA").addItem("Enviar termos aos responsáveis", "enviarTermos").addToUi();
}

var PEOPLE = ["", "m2_", "m3_", "m4_"]; // column prefixes written by /api/inscricao

/** Minors with a guardian in one application row ({header: value}). */
function guardiansOf(row) {
  return PEOPLE.filter(function (p) { return row[p + "responsavel_email"]; }).map(function (p) {
    return { minor: row[p + "nome"], guardian: row[p + "responsavel_nome"], email: row[p + "responsavel_email"] };
  });
}

function termoEmail(g, termoUrl) {
  return {
    to: g.email,
    subject: "Hack IA Brasil: autorização para " + g.minor,
    body:
      "Olá, " + g.guardian + ".\n\n" +
      g.minor + " foi selecionado(a) para o Hack IA Brasil, um hackathon gratuito no sábado, 21 de novembro, " +
      "das 8h às 18h, na R. Manoel Gualberto, 255, Miramar, João Pessoa.\n\n" +
      "Como " + g.minor + " tem menos de 18 anos, precisamos da sua autorização para a participação e o uso de imagem. " +
      "O termo está aqui:\n" + termoUrl + "\n\n" +
      "Você pode assinar de graça pelo gov.br (assinador.iti.br) ou à mão. Responda a este e-mail com o termo assinado " +
      "ou entregue a versão impressa no credenciamento, às 8h. Sem o termo, não conseguimos liberar a entrada.\n\n" +
      "Qualquer dúvida, é só responder.\n\nEquipe Hack IA Brasil",
  };
}

function enviarTermos() {
  var ui = SpreadsheetApp.getUi();
  var termoUrl = PropertiesService.getScriptProperties().getProperty("TERMO_URL");
  if (!termoUrl) return ui.alert("Falta a propriedade TERMO_URL nas configurações do script.");

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var statusCol = headers.indexOf("status");
  if (statusCol === -1) return ui.alert('Crie uma coluna "status" e escreva "aprovado" nas linhas aprovadas.');
  var sentCol = headers.indexOf("termos_enviados_em");
  if (sentCol === -1) {
    sentCol = headers.length;
    sheet.getRange(1, sentCol + 1).setValue("termos_enviados_em");
  }

  var sent = 0;
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][statusCol]).trim().toLowerCase() !== "aprovado" || data[r][sentCol]) continue;
    var row = {};
    headers.forEach(function (h, i) { row[h] = data[r][i]; });
    var guardians = guardiansOf(row);
    guardians.forEach(function (g) { MailApp.sendEmail(termoEmail(g, termoUrl)); });
    // also marks approved rows with no minors, so they aren't checked again
    sheet.getRange(r + 1, sentCol + 1).setValue(guardians.length ? new Date() : "sem menores");
    sent += guardians.length;
  }
  ui.alert(sent + " e-mail(s) enviados. Cota diária do Gmail: " + MailApp.getRemainingDailyQuota() + " restantes.");
}
