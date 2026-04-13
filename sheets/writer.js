/**
 * Google Sheets Writer
 * Writes data back to the Google Sheets control center
 */

/**
 * Write rows to a specific tab (appends or creates header + data)
 */
async function writeToTab(sheets, spreadsheetId, tabName, headers, rows) {
  // Check if header row already exists
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!A1:1`
  });

  const existingHeaders = existing.data.values?.[0] ?? [];
  const hasHeaders = existingHeaders.length > 0;

  const valuesToWrite = hasHeaders ? rows : [headers, ...rows];
  const startRow = hasHeaders ? await getNextEmptyRow(sheets, spreadsheetId, tabName) : 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A${startRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: valuesToWrite }
  });
}

/**
 * Get the next empty row number in a tab
 */
async function getNextEmptyRow(sheets, spreadsheetId, tabName) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!A:A`
  });

  return (response.data.values?.length ?? 0) + 1;
}

/**
 * Append a single row to a tab
 */
async function appendRow(sheets, spreadsheetId, tabName, row) {
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A:A`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] }
  });
}

/**
 * Clear and rewrite an entire tab
 */
async function rewriteTab(sheets, spreadsheetId, tabName, headers, rows) {
  // Clear existing data
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${tabName}!A:ZZ`
  });

  // Write headers + all rows
  const allRows = [headers, ...rows];
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: allRows }
  });
}

module.exports = {
  writeToTab,
  appendRow,
  rewriteTab,
  getNextEmptyRow
};
