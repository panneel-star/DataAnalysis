import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Dataset, ColumnSchema, DataType } from "../types";

// Convert Google Sheet URL to CSV Export URL
export function getGoogleSheetsCsvUrl(url: string): string {
  const matches = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (matches && matches[1]) {
    const spreadsheetId = matches[1];
    const gidMatches = url.match(/[#&]gid=([0-9]+)/);
    const gid = gidMatches && gidMatches[1] ? gidMatches[1] : "0";
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  }
  return url;
}

// Clean string for checking if it's a number (strips commas, currency symbols, and spaces)
function cleanNumericString(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val).trim();
  // Remove ฿, $, %, commas, and trim whitespace
  return str.replace(/[฿\$%,\s]/g, "");
}

// Helper to check if a value is a valid numeric representation
function isNumeric(cleanVal: string): boolean {
  if (!cleanVal) return false;
  return !isNaN(Number(cleanVal));
}

// Helper to check if a value is a valid date representation
function isDate(val: any): boolean {
  if (val === null || val === undefined) return false;
  const str = String(val).trim();
  
  // Exclude single numbers or very short strings which can parse as years mistakenly
  if (/^\d{1,4}$/.test(str)) return false;
  
  // Exclude pure numbers that match epoch timestamps unnecessarily
  if (/^\d+$/.test(str)) return false;

  // Check with regular expressions or Date parse
  // Common Thai/English date formats: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
  const datePartsRegex = /^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/;
  const isRegexMatch = datePartsRegex.test(str);
  
  const parsed = Date.parse(str);
  return isRegexMatch || (!isNaN(parsed) && str.length > 5);
}

// Parse excel file (ArrayBuffer)
export function parseExcel(arrayBuffer: ArrayBuffer, fileName: string): Promise<Dataset> {
  return new Promise((resolve, reject) => {
    try {
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      
      if (json.length === 0) {
        throw new Error("ไฟล์ Excel ไม่มีข้อมูลแถวหรือคอลัมน์");
      }
      
      resolve(analyzeDataset(json, fileName));
    } catch (error) {
      reject(error);
    }
  });
}

// Parse csv text
export function parseCSV(csvText: string, fileName: string): Promise<Dataset> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          reject(new Error("ไฟล์ CSV ไม่มีข้อมูล"));
          return;
        }
        resolve(analyzeDataset(results.data as Record<string, any>[], fileName));
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

// Analyze parsed dynamic array of objects to construct Dataset automatically
function analyzeDataset(rows: Record<string, any>[], fileName: string): Dataset {
  // Extract all columns/headers
  // Scan first few rows to find all possible columns, just in case some are absent in the first row
  const allHeadersSet = new Set<string>();
  const scanRows = Math.min(rows.length, 50);
  for (let i = 0; i < scanRows; i++) {
    Object.keys(rows[i] || {}).forEach((key) => {
      if (key && key.trim()) {
        allHeadersSet.add(key.trim());
      }
    });
  }
  
  const headers = Array.from(allHeadersSet);
  const totalRows = rows.length;
  
  // Format rows so that key references are untrimmed but neat
  const polishedRows = rows.map((r) => {
    const fresh: Record<string, any> = {};
    headers.forEach((h) => {
      fresh[h] = r[h] !== undefined ? r[h] : "";
    });
    return fresh;
  });

  // Calculate stats and detect data type for each header
  const columns: ColumnSchema[] = headers.map((colName) => {
    const nonNullValues = polishedRows
      .map((r) => r[colName])
      .filter((val) => val !== null && val !== undefined && String(val).trim() !== "");
    
    const countNonNull = nonNullValues.length;
    const hasNulls = countNonNull < totalRows;

    // Default Fallback
    let type: DataType = "Text";
    let min: number | undefined;
    let max: number | undefined;

    // Gather unique string representations
    const distinctSet = new Set<string>();
    nonNullValues.forEach((val) => distinctSet.add(String(val).trim()));
    const uniqueValues = Array.from(distinctSet).sort();

    if (countNonNull > 0) {
      // 1. Check for Numeric
      const numericScores = nonNullValues.map((val) => {
        const cleaned = cleanNumericString(val);
        return isNumeric(cleaned) ? 1 : 0;
      });
      const numericSum = numericScores.reduce((a, b) => a + b, 0);
      const isMostlyNumeric = numericSum / countNonNull >= 0.85;

      // 2. Check for Date
      const dateScores = nonNullValues.map((val) => (isDate(val) ? 1 : 0));
      const dateSum = dateScores.reduce((a, b) => a + b, 0);
      const isMostlyDate = dateSum / countNonNull >= 0.85;

      if (isMostlyNumeric) {
        type = "Number";
        const parsedNums = nonNullValues
          .map((val) => Number(cleanNumericString(val)))
          .filter((v) => !isNaN(v));
        if (parsedNums.length > 0) {
          min = Math.min(...parsedNums);
          max = Math.max(...parsedNums);
        }
      } else if (isMostlyDate) {
        type = "Date";
      } else if (uniqueValues.length <= 15 || uniqueValues.length < Math.max(5, countNonNull * 0.25)) {
        // If unique values are relatively low, or make up < 25% of elements, treat as Categorical
        type = "Category";
      } else {
        type = "Text";
      }
    }

    return {
      name: colName,
      type,
      uniqueValues,
      min,
      max,
      hasNulls,
    };
  });

  return {
    fileName,
    rowCount: totalRows,
    columns,
    rows: polishedRows,
  };
}
