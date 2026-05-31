import { AlertCircle, CheckCircle2, FileText, Loader2, Sparkles, Upload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { ai } from "../../shared/services/gemini";
import { saveAs } from "file-saver";

interface FormatMenuRow {
  date: string;
  lunch: string;
  dinner: string;
}

const extractJsonArray = (text: string) => {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Không thể phân tích kết quả từ AI.");
  return JSON.parse(jsonMatch[0]) as FormatMenuRow[];
};

const renderMealPreview = (value: string) => {
  if (value.trim().toUpperCase() === "N/A") {
    return <div className="text-center font-bold py-4 text-gray-400">N/A</div>;
  }

  const lines = value.split("\n").filter((line) => line.trim());
  const isIndian = lines[0]?.toLowerCase().includes("indian");
  let menuStartIdx = 2;
  if (
    lines[2]?.trim().toLowerCase().startsWith("tel:") ||
    lines[2]?.trim().toLowerCase().startsWith("phone:") ||
    lines[2]?.trim().toLowerCase().startsWith("sdt:")
  ) {
    menuStartIdx = 3;
  }

  return lines.map((line, idx) => {
    let className = "text-[10pt]";
    if (idx === 0) className = "font-bold text-[11pt] mb-0.5 uppercase";
    else if (idx === 1) {
      className = "text-[9pt] italic text-gray-500 mb-1";
      if (line.trim().toUpperCase() === "ADDRESS: TBA") {
        className = "text-[9pt] italic text-red-600 mb-1 font-bold";
      }
    } else if (idx === 2 && menuStartIdx === 3) {
      className = "text-[9pt] italic text-gray-500 mb-4";
    } else if (idx >= menuStartIdx) {
      const relativeIdx = idx - menuStartIdx;
      if (!isIndian && relativeIdx % 2 !== 0) className = "italic text-gray-600 mb-3 text-[10pt]";
      else if (isIndian) className = "text-[10pt] mb-2";
    }
    if (idx === 1 && menuStartIdx === 2) className = "text-[9pt] italic text-gray-500 mb-4";
    return (
      <div key={idx} className={className}>
        {line}
      </div>
    );
  });
};

export function FormatMenuFeature() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rows, setRows] = useState<FormatMenuRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (fileToProcess: File) => {
    setIsProcessing(true);
    setError(null);
    setRows([]);

    try {
      const buffer = await fileToProcess.arrayBuffer();
      const isExcel = fileToProcess.name.endsWith(".xlsx") || fileToProcess.name.endsWith(".xls");
      let inputData: unknown;

      if (isExcel) {
        const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        inputData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" });
        if ((inputData as unknown[]).length === 0) throw new Error("File Excel không có dữ liệu.");
      } else {
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        inputData = result.value;
        if (!String(inputData).trim()) throw new Error("File Word không có nội dung.");
      }

      const prompt = `Bạn là chuyên gia du lịch và ẩm thực. Hãy định dạng dữ liệu menu tour sau thành một mảng JSON duy nhất.
Yêu cầu:
- Output là array JSON, không thêm giải thích.
- Mỗi item có cấu trúc: {"date":"DD/MM/YYYY","lunch":"...","dinner":"..."}.
- Giữ nguyên tên nhà hàng.
- Nếu bữa ăn là N/A hoặc trống, chỉ trả "N/A".
- Nếu không có năm, mặc định năm 2026.
- Dòng 1 là tên nhà hàng, dòng 2 là địa chỉ hoặc "Address: TBA", dòng 3 là điện thoại nếu có.
- Menu không phải Indian cần song ngữ Anh - Việt; Indian giữ nguyên tiếng Anh.
- Không tự chế món ăn, địa chỉ, điện thoại hoặc thông tin không có trong input.

DỮ LIỆU ĐẦU VÀO:
${isExcel ? JSON.stringify(inputData) : inputData}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
      });
      setRows(extractJsonArray(response.text || ""));
    } catch (err: any) {
      console.error("Format menu processing error:", err);
      setError(err.message || "Có lỗi xảy ra khi xử lý file menu.");
    } finally {
      setIsProcessing(false);
    }
  };

  const exportToWord = async () => {
    if (rows.length === 0) return;

    try {
      const {
        AlignmentType,
        BorderStyle,
        Document,
        Packer,
        Paragraph,
        Table,
        TableCell,
        TableRow,
        TextRun,
        VerticalAlign,
        WidthType,
      } = await import("docx");

      const makeMealParagraphs = (value: string) => {
        if (value.trim().toUpperCase() === "N/A") {
          return [new Paragraph({ children: [new TextRun({ text: "N/A", bold: true, size: 22 })], alignment: AlignmentType.CENTER })];
        }

        const lines = value.split("\n").filter((line) => line.trim());
        return lines.map((line, idx) => {
          const trimmed = line.trim();
          if (idx === 0) return new Paragraph({ children: [new TextRun({ text: trimmed, bold: true, size: 22 })] });
          if (idx === 1 || trimmed.toLowerCase().startsWith("tel:") || trimmed.toLowerCase().startsWith("phone:")) {
            return new Paragraph({ children: [new TextRun({ text: trimmed, italics: idx === 1, size: 20 })] });
          }
          return new Paragraph({ children: [new TextRun({ text: trimmed, size: 20 })] });
        });
      };

      const tableRows = [
        new TableRow({
          children: ["Meals\nDate", "Lunch", "Dinner"].map(
            (header) =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: header, bold: true, size: 22 })], alignment: AlignmentType.CENTER })],
                verticalAlign: VerticalAlign.CENTER,
              }),
          ),
        }),
        ...rows.map(
          (row) =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: row.date, bold: true, size: 22 })] })] }),
                new TableCell({ children: makeMealParagraphs(row.lunch) }),
                new TableCell({ children: makeMealParagraphs(row.dinner) }),
              ],
            }),
        ),
      ];

      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                children: [new TextRun({ text: "TOUR MENU PLAN", bold: true, size: 28 })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 240 },
              }),
              new Table({
                rows: tableRows,
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1 },
                  bottom: { style: BorderStyle.SINGLE, size: 1 },
                  left: { style: BorderStyle.SINGLE, size: 1 },
                  right: { style: BorderStyle.SINGLE, size: 1 },
                  insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                  insideVertical: { style: BorderStyle.SINGLE, size: 1 },
                },
              }),
            ],
          },
        ],
      });

      saveAs(await Packer.toBlob(doc), `Menu_Plan_${new Date().getTime()}.docx`);
    } catch (err) {
      console.error("Export to Word error:", err);
      setError("Không thể xuất file Word.");
    }
  };

  const acceptFile = (nextFile?: File) => {
    if (!nextFile) return;
    setFile(nextFile);
    processFile(nextFile);
  };

  return (
    <motion.div
      key="format-menu-mode"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-secondary/5 border border-black/5">
        <h2 className="text-2xl font-serif italic text-secondary mb-6">Format Menu Song Ngữ</h2>

        <div
          className={`bg-white p-12 rounded-[2rem] shadow-xl shadow-secondary/5 border-2 border-dashed transition-all flex flex-col items-center text-center group cursor-pointer outline-none focus:ring-4 focus:ring-primary/10 h-64 justify-center ${
            isDragging ? "border-primary bg-primary/5" : "border-slate-200 hover:border-primary/50 hover:bg-slate-50"
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            acceptFile(event.dataTransfer.files[0]);
          }}
          onClick={() => inputRef.current?.click()}
          tabIndex={0}
        >
          <input
            type="file"
            ref={inputRef}
            className="hidden"
            accept=".xlsx,.xls,.docx,.doc"
            onChange={(event) => {
              acceptFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />

          {isProcessing ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={40} className="animate-spin text-primary" />
              <p className="font-bold text-secondary">Đang phân tích Menu với AI...</p>
            </div>
          ) : file ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>
              <p className="font-medium text-gray-900 truncate max-w-[300px]">{file.name}</p>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setFile(null);
                  setRows([]);
                }}
                className="text-sm text-red-600 hover:underline"
              >
                Thay đổi file
              </button>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                <Upload size={32} />
              </div>
              <h3 className="font-bold text-secondary mb-1">Kéo thả file Excel hoặc Word Menu</h3>
              <p className="text-xs text-slate-400 font-medium tracking-wide">
                AI sẽ tự động dịch và định dạng song ngữ
              </p>
            </>
          )}
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg text-sm mt-6"
            >
              <AlertCircle size={16} /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        {rows.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-12 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-serif italic text-secondary">Kết quả định dạng</h3>
              <button
                onClick={exportToWord}
                className="bg-primary text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-opacity-90 transition-all flex items-center gap-2 shadow-xl shadow-primary/20 scale-105 active:scale-95"
              >
                <FileText size={18} /> Xuất Word
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-100 font-['Times_New_Roman']">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11pt] uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-4 font-semibold w-32">Ngày</th>
                    <th className="px-6 py-4 font-semibold">Bữa trưa (Lunch)</th>
                    <th className="px-6 py-4 font-semibold">Bữa tối (Dinner)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-[11pt] font-medium text-gray-900 align-top">{row.date}</td>
                      <td className="px-6 py-4 text-sm text-gray-800 align-top whitespace-pre-line">{renderMealPreview(row.lunch)}</td>
                      <td className="px-6 py-4 text-sm text-gray-800 align-top whitespace-pre-line">{renderMealPreview(row.dinner)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
