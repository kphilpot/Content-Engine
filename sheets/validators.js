function normalizeHeader(header) {
  return String(header ?? "").trim();
}

function cleanCell(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return typeof value === "string" ? value.trim() : value;
}

function isEmptyValue(value) {
  return value === "" || value === null || value === undefined;
}

function parseBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "n", ""].includes(normalized)) {
    return false;
  }

  return null;
}

function parseNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value) {
  const parsed = parseNumber(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseDateTime(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}

function splitList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value ?? "")
    .split(/[\n,|;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function detectValueType(value) {
  if (isEmptyValue(value)) {
    return "empty";
  }

  if (parseBoolean(value) !== null) {
    return "boolean";
  }

  if (parseInteger(value) !== null) {
    return "integer";
  }

  if (parseNumber(value) !== null) {
    return "number";
  }

  if (parseDateTime(value) !== null) {
    return "datetime";
  }

  return "string";
}

function buildRows(values) {
  const [headerRow = [], ...dataRows] = values;
  const headers = headerRow.map(normalizeHeader);

  const rows = dataRows
    .filter((row) => row.some((cell) => !isEmptyValue(cleanCell(cell))))
    .map((row, index) => {
      const record = {};
      headers.forEach((header, columnIndex) => {
        if (!header) {
          return;
        }
        record[header] = cleanCell(row[columnIndex]);
      });
      record.__rowNumber = index + 2;
      return record;
    });

  return { headers, rows };
}

function validateRequiredColumns(headers, requiredColumns) {
  const missingColumns = requiredColumns.filter((column) => !headers.includes(column));
  return {
    ok: missingColumns.length === 0,
    missingColumns
  };
}

function validateRequiredFields(rows, requiredFields) {
  const emptyFields = [];

  rows.forEach((row) => {
    requiredFields.forEach((field) => {
      if (isEmptyValue(row[field])) {
        emptyFields.push({
          rowNumber: row.__rowNumber,
          field
        });
      }
    });
  });

  return {
    ok: emptyFields.length === 0,
    emptyFields
  };
}

function analyzeColumnTypes(rows, headers) {
  return headers.reduce((accumulator, header) => {
    const types = new Set();

    rows.forEach((row) => {
      const type = detectValueType(row[header]);
      if (type !== "empty") {
        types.add(type);
      }
    });

    accumulator[header] = Array.from(types);
    return accumulator;
  }, {});
}

module.exports = {
  analyzeColumnTypes,
  buildRows,
  cleanCell,
  detectValueType,
  isEmptyValue,
  parseBoolean,
  parseDateTime,
  parseInteger,
  parseNumber,
  splitList,
  validateRequiredColumns,
  validateRequiredFields
};
