const { TAB_SCHEMAS, TAB_NAMES } = require("../sheets/schema");
const {
  analyzeColumnTypes,
  buildRows,
  validateRequiredColumns,
  validateRequiredFields
} = require("../sheets/validators");

function buildTabState(tabName, values) {
  const schema = TAB_SCHEMAS[tabName];
  const { headers, rows } = buildRows(values);
  const requiredColumnValidation = validateRequiredColumns(headers, schema.requiredColumns);
  const requiredFieldValidation = validateRequiredFields(rows, schema.requiredFields);
  const columnTypes = analyzeColumnTypes(rows, headers);

  return {
    name: tabName,
    headers,
    rows,
    columnCount: headers.filter(Boolean).length,
    rowCount: rows.length,
    schema: schema,
    schemaValid: requiredColumnValidation.ok,
    requiredColumnsMissing: requiredColumnValidation.missingColumns,
    requiredFieldsEmpty: requiredFieldValidation.emptyFields,
    columnTypes
  };
}

function buildValidationReport(controlCenterState) {
  const reportLines = [
    `Control Center Validation Report`,
    `Spreadsheet ID: ${controlCenterState.spreadsheetId}`,
    `Tabs expected/read: ${TAB_NAMES.length}/${Object.keys(controlCenterState.tabs).length}`
  ];

  TAB_NAMES.forEach((tabName) => {
    const tab = controlCenterState.tabs[tabName];
    reportLines.push(
      `- ${tabName}: read=${tab.readSuccess ? "yes" : "no"}, columns=${tab.columnCount}, rows=${tab.rowCount}`
    );

    if (tab.requiredColumnsMissing.length) {
      reportLines.push(`  Missing columns: ${tab.requiredColumnsMissing.join(", ")}`);
    }

    if (tab.readError) {
      reportLines.push(`  Read error: ${tab.readError}`);
    }

    if (tab.requiredFieldsEmpty.length) {
      const summary = tab.requiredFieldsEmpty
        .map((item) => `row ${item.rowNumber} -> ${item.field}`)
        .join("; ");
      reportLines.push(`  Empty required fields: ${summary}`);
    }
  });

  return reportLines.join("\n");
}

function buildControlCenterState(readResult) {
  const tabs = {};

  TAB_NAMES.forEach((tabName) => {
    const tabState = buildTabState(tabName, readResult.rawTabs[tabName] ?? []);
    const readMeta = readResult.readLog.find((entry) => entry.tabName === tabName) ?? {
      success: false,
      error: "Tab was not attempted"
    };
    tabState.readSuccess = readMeta.success;
    tabState.readError = readMeta.error ?? null;
    tabs[tabName] = tabState;
  });

  const controlCenterState = {
    spreadsheetId: readResult.spreadsheetId,
    availableTabNames: readResult.availableTabNames,
    readLog: readResult.readLog,
    tabs,
    generatedAt: new Date().toISOString()
  };

  const validationReport = buildValidationReport(controlCenterState);

  return {
    controlCenterState,
    validationReport
  };
}

module.exports = {
  buildControlCenterState
};
