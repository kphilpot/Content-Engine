const { google } = require("googleapis");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const { TAB_NAMES } = require("./schema");

// Load .env.local if it exists
const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  const lines = envContent.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

function createSheetsClient(apiKey) {
  let auth = apiKey;

  // If apiKey is a JSON string, parse it and create auth client
  if (typeof apiKey === "string" && apiKey.includes('"type"')) {
    try {
      const credentials = JSON.parse(apiKey);
      auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
      });
    } catch (error) {
      throw new Error(`Failed to parse API key as JSON: ${error.message}`);
    }
  }

  return google.sheets({
    version: "v4",
    auth: auth
  });
}

async function readSpreadsheetMetadata(sheets, spreadsheetId) {
  return sheets.spreadsheets.get({
    spreadsheetId,
    includeGridData: false
  });
}

async function readTabValues(sheets, spreadsheetId, tabName) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!A:ZZ`
  });

  return response.data.values ?? [];
}

function parseGvizResponse(payload) {
  const match = String(payload).match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);?$/);
  if (!match) {
    throw new Error("Unexpected GViz response format");
  }

  const parsed = JSON.parse(match[1]);
  const columns = parsed.table?.cols ?? [];
  const rows = parsed.table?.rows ?? [];

  const headerRow = columns.map((column, index) => column.label || column.id || `column_${index + 1}`);
  const valueRows = rows.map((row) =>
    (row.c ?? []).map((cell) => {
      if (!cell) {
        return "";
      }
      return cell.f ?? cell.v ?? "";
    })
  );

  return [headerRow, ...valueRows];
}

async function readPublicTabValues(spreadsheetId, tabName) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Public sheet request failed with status ${response.status}`);
  }

  const payload = await response.text();
  return parseGvizResponse(payload);
}

async function readWorkbookExport(spreadsheetId) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Workbook export failed with status ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  return workbook;
}

function worksheetToValues(workbook, tabName) {
  const worksheet = workbook.Sheets[tabName];
  if (!worksheet) {
    throw new Error(`Tab "${tabName}" not found in workbook export`);
  }

  return XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    blankrows: false,
    defval: ""
  });
}

async function readAllTabs(spreadsheetId, options = {}) {
  const apiKey = options.apiKey ?? process.env.GOOGLE_SHEETS_API_KEY ?? null;
  const logger = options.logger ?? console;
  let availableTabNames = [];
  let sheets = null;
  let workbook = null;

  if (apiKey) {
    sheets = createSheetsClient(apiKey);
    logger.log(`[reader] Reading spreadsheet metadata for ${spreadsheetId} with Google Sheets API`);

    const metadataResponse = await readSpreadsheetMetadata(sheets, spreadsheetId);
    availableTabNames = (metadataResponse.data.sheets ?? [])
      .map((sheet) => sheet.properties?.title)
      .filter(Boolean);
  } else {
    logger.log(
      `[reader] GOOGLE_SHEETS_API_KEY is not set. Falling back to workbook export reads for ${spreadsheetId}`
    );
    workbook = await readWorkbookExport(spreadsheetId);
    availableTabNames = workbook.SheetNames ?? [...TAB_NAMES];
  }

  const rawTabs = {};
  const readLog = [];

  for (const tabName of TAB_NAMES) {
    logger.log(`[reader] Reading tab: ${tabName}`);
    try {
      const values = sheets
        ? await readTabValues(sheets, spreadsheetId, tabName)
        : worksheetToValues(workbook, tabName);
      rawTabs[tabName] = values;
      readLog.push({
        tabName,
        success: true,
        rowCount: values.length
      });
    } catch (error) {
      rawTabs[tabName] = [];
      readLog.push({
        tabName,
        success: false,
        error: error.message
      });
      logger.error(`[reader] Failed to read tab "${tabName}": ${error.message}`);
    }
  }

  return {
    spreadsheetId,
    availableTabNames,
    rawTabs,
    readLog
  };
}

module.exports = {
  readAllTabs
};
