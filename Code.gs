/**
 * Google Apps Script — PJ Tissue Tracker Survey Backend
 *
 * HOW TO DEPLOY:
 *  1. Open https://sheets.google.com and create a new spreadsheet
 *  2. Name it "PJ Tracker Survey Responses" (or anything you like)
 *  3. In the Sheet, click Extensions → Apps Script
 *  4. Delete any code in the editor and PASTE THIS ENTIRE FILE
 *  5. Click the disk icon (Save), name the project "PJ Survey Backend"
 *  6. Click Deploy → New deployment
 *  7. Type: Web app
 *  8. Execute as: Me
 *  9. Who has access: Anyone
 * 10. Click Deploy → copy the Web App URL
 * 11. Paste that URL into js/app.js → SURVEY_ENDPOINT
 *
 * That's it. Every form submission appends a new row to your Sheet.
 */

var SHEET_COL_TIMESTAMP = 0; // column A (zero-indexed)

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // If the sheet is empty, write the header row first
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Timestamp',
        'Name',
        'Phone',
        'Role',
        'Store / Business Name',
        'Store Type',
        'Store Type Other',
        'Length (cm)',
        'Width (cm)',
        'Ply',
        'Cost to Store (₹)',
        'Consumption',
        'Consumption Metric',
        'Has Logo',
        'Vendor Number',
        'Vendor Detail',
        'Interested In',
        'Notes'
      ]);
    }

    sheet.appendRow([
      new Date(),
      data.name || '',
      data.phone || '',
      data.role || '',
      data.businessName || '',
      data.storeType || '',
      data.storeTypeOther || '',
      data.length || '',
      data.width || '',
      data.ply || '',
      data.costToStore || '',
      data.consumption || '',
      data.consumptionMetric || '',
      data.hasLogo || '',
      data.vendorNumber || '',
      data.vendorDetail || '',
      data.interestedIn || '',
      data.notes || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'ping';
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    if (action === 'stats') {
      return statsResponse_(sheet);
    }

    // Default: simple ping + count
    var lastRow = sheet.getLastRow();
    var count = lastRow > 1 ? lastRow - 1 : 0; // minus header
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        message: 'PJ Survey backend is running. Use POST to submit.',
        count: count
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function statsResponse_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        total: 0,
        today: 0,
        week: 0,
        byDay: [],
        byStoreType: {},
        byRole: {},
        interestedWebsite: 0,
        interestedApp: 0
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var now = new Date();
  var startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  var total = data.length;
  var today = 0, week = 0;
  var byDay = {};     // 'YYYY-MM-DD' -> count
  var byStoreType = {};
  var byRole = {};
  var interestedWebsite = 0, interestedApp = 0;

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var ts = row[0];
    var storeType = String(row[5] || 'Unknown').trim() || 'Unknown';
    var role = String(row[3] || 'Unknown').trim() || 'Unknown';
    var interest = String(row[16] || '').trim();

    if (ts instanceof Date) {
      if (ts >= startOfToday) today++;
      if (ts >= startOfWeek) week++;
      var key = Utilities.formatDate(ts, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      byDay[key] = (byDay[key] || 0) + 1;
    }

    byStoreType[storeType] = (byStoreType[storeType] || 0) + 1;
    byRole[role] = (byRole[role] || 0) + 1;
    if (interest === 'Website' || interest === 'Both') interestedWebsite++;
    if (interest === 'App' || interest === 'Both') interestedApp++;
  }

  // Build sorted 7-day series
  var series = [];
  for (var d = 6; d >= 0; d--) {
    var day = new Date(startOfToday);
    day.setDate(day.getDate() - d);
    var k = Utilities.formatDate(day, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    series.push({ date: k, count: byDay[k] || 0 });
  }

  return ContentService
    .createTextOutput(JSON.stringify({
      ok: true,
      total: total,
      today: today,
      week: week,
      byDay: series,
      byStoreType: byStoreType,
      byRole: byRole,
      interestedWebsite: interestedWebsite,
      interestedApp: interestedApp
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
