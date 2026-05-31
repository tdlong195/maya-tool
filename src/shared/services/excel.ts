import ExcelJS from "exceljs";
import * as XLSX from "xlsx";

export { ExcelJS, XLSX };

export const readExcelWorkbook = async (file: File, options?: XLSX.ParsingOptions) => {
  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, { type: "array", ...options });
};
