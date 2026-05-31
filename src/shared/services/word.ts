import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import Docxtemplater from "docxtemplater";
import mammoth from "mammoth";
import PizZip from "pizzip";

export {
  Document,
  Docxtemplater,
  mammoth,
  Packer,
  Paragraph,
  PizZip,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
};

export const extractDocxText = (file: File) =>
  file.arrayBuffer().then((arrayBuffer) => mammoth.extractRawText({ arrayBuffer }));
