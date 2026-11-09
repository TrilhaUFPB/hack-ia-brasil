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
