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
 * 11. Paste that URL into js/app.js → SURVEY_CONFIG.endpoint
 *
 * That's it. Every form submission appends a new row to your Sheet.
 */
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
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: 'PJ Survey backend is running. Use POST to submit.' }))
    .setMimeType(ContentService.MimeType.JSON);
}
