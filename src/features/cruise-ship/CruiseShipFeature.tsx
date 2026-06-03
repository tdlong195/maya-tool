import ExcelJS from "exceljs";
import { AlertCircle, CheckCircle2, FileText, Loader2, Sparkles, Upload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

const getColumnContentWidth = (key: string, rows: any[]) => {
  if (key === "TT") return 6;

  const longestTextLength = rows.reduce((maxLength, row) => {
    const text = String(row[key] ?? "");
    const longestLine = text
      .split(/\r?\n/)
      .reduce((lineMax, line) => Math.max(lineMax, line.trim().length), 0);
    return Math.max(maxLength, longestLine);
  }, key.length);

  return Math.min(Math.max(longestTextLength + 2, 10), 55);
};

export function CruiseShipFeature() {
  const fullInputRef = useRef<HTMLInputElement>(null);
  const summaryInputRef = useRef<HTMLInputElement>(null);
  const [fullList, setFullList] = useState<File | null>(null);
  const [summaryList, setSummaryList] = useState<File | null>(null);
  const [isDraggingFull, setIsDraggingFull] = useState(false);
  const [isDraggingSummary, setIsDraggingSummary] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].kind !== "file") continue;
        const file = items[i].getAsFile();
        if (!file) continue;
        event.preventDefault();
        if (!fullList) setFullList(file);
        else if (!summaryList) setSummaryList(file);
        setError(null);
        break;
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [fullList, summaryList]);

  const readExcelRows = (file: File): Promise<any[][]> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const workbook = XLSX.read(event.target?.result, { type: "binary" });
          for (const sheetName of workbook.SheetNames) {
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
              header: 1,
              defval: "",
              raw: false,
            }) as any[][];
            if (rows.length > 0) {
              resolve(rows);
              return;
            }
          }
          resolve([]);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });

  const processCruiseShip = async () => {
    if (!fullList || !summaryList) return;
    setIsProcessing(true);
    setError(null);

    try {
      const idAliases = [
        "id",
        "mã",
        "booking id",
        "your booking id",
        "code",
        "id no",
        "ref",
        "reference",
        "mã đặt chỗ",
        "mã booking",
        "pax id",
        "passenger id",
      ];
      const normalize = (value: any) =>
        String(value || "")
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "");

      const fullRows = await readExcelRows(fullList);
      const summaryRows = await readExcelRows(summaryList);
      if (fullRows.length === 0) throw new Error("File danh sách FULL không có dữ liệu.");
      if (summaryRows.length === 0) throw new Error("File danh sách TÓM TẮT không có dữ liệu.");

      let fullHeaderIdx = -1;
      for (let i = 0; i < Math.min(fullRows.length, 50); i++) {
        if (
          fullRows[i].some((cell) =>
            idAliases.some((alias) => normalize(cell).includes(normalize(alias))),
          )
        ) {
          fullHeaderIdx = i;
          break;
        }
      }
      if (fullHeaderIdx === -1) throw new Error("Không tìm thấy cột ID trong file danh sách FULL.");

      const fullHeader = fullRows[fullHeaderIdx];
      const fullIdColIdx = fullHeader.findIndex((cell) =>
        idAliases.some((alias) => normalize(cell).includes(normalize(alias))),
      );
      const fullDataMap = new Map<string, any[]>();
      for (let i = fullHeaderIdx + 1; i < fullRows.length; i++) {
        const row = fullRows[i];
        const id = normalize(row[fullIdColIdx]);
        if (!id) continue;
        const rowObj: any = {};
        fullHeader.forEach((header, idx) => {
          if (header) rowObj[String(header).trim()] = row[idx];
        });
        if (!fullDataMap.has(id)) fullDataMap.set(id, []);
        fullDataMap.get(id)!.push(rowObj);
      }

      const idColIndices: number[] = [];
      const portOrder: string[] = [];
      for (let r = 0; r < Math.min(summaryRows.length, 20); r++) {
        summaryRows[r].forEach((cell, idx) => {
          if (normalize(cell) === "yourbookingid" && !idColIndices.includes(idx)) {
            idColIndices.push(idx);
          }
        });
      }
      if (idColIndices.length === 0) {
        throw new Error("Không tìm thấy cột 'Your booking ID' trong file TÓM TẮT.");
      }

      const result: any[] = [];
      idColIndices.forEach((idColIdx) => {
        let portName = "";
        for (let r = 0; r < 5; r++) {
          portName = String(summaryRows[r]?.[idColIdx] || summaryRows[r]?.[idColIdx + 1] || "").trim();
          if (portName) break;
        }
        if (portName && !portOrder.includes(portName)) portOrder.push(portName);

        for (let r = 0; r < summaryRows.length; r++) {
          if (normalize(summaryRows[r][idColIdx]) !== "yourbookingid") continue;
          const headerRow = summaryRows[r];
          let balanceInCashColIdx = -1;
          for (let c = idColIdx; c < Math.min(headerRow.length, idColIdx + 20); c++) {
            if (normalize(headerRow[c]).includes("balanceincash")) {
              balanceInCashColIdx = c;
              break;
            }
          }

          const guideInfo = String(summaryRows[r - 1]?.[idColIdx] || "")
            .replace(/^(Guide information|Guide info|Guide|Thông tin hướng dẫn|HDV)[:\s]*/i, "")
            .trim();
          const groupName = String(summaryRows[r - 2]?.[idColIdx] || "").trim();
          let expectedTotal = 0;
          const groupItems: any[] = [];

          let dataRowIdx = r + 1;
          while (dataRowIdx < summaryRows.length) {
            const row = summaryRows[dataRowIdx];
            if (!row) break;
            const idVal = normalize(row[idColIdx]);
            const secondColVal = normalize(row[idColIdx + 1]);
            if (secondColVal === "total" || idVal === "total") {
              const paxVal = parseInt(String(row[idColIdx + 2]));
              if (!isNaN(paxVal)) expectedTotal = paxVal;
              break;
            }
            if (idVal === "yourbookingid") break;
            if (!row[idColIdx] && !row[idColIdx + 1] && !row[idColIdx + 2]) break;

            if (idVal && fullDataMap.has(idVal)) {
              const balanceInCash =
                balanceInCashColIdx !== -1 ? String(row[balanceInCashColIdx] || "").trim() : "";
              fullDataMap.get(idVal)!.forEach((match) => {
                const item = {
                  Cảng: portName,
                  Group: groupName,
                  Guide: guideInfo,
                  ExpectedTotal: 0,
                  "Balance in cash": balanceInCash,
                  __bookingId: idVal,
                  ...match,
                };
                result.push(item);
                groupItems.push(item);
              });
            }
            dataRowIdx++;
          }
          if (expectedTotal > 0) groupItems.forEach((item) => (item.ExpectedTotal = expectedTotal));
          r = dataRowIdx;
        }
      });

      if (result.length === 0) {
        throw new Error("Không tìm thấy dữ liệu khớp giữa hai file. Vui lòng kiểm tra lại giá trị ID/Mã.");
      }

      const workbook = new ExcelJS.Workbook();
      const allKeys = new Set<string>();
      result.forEach((item) => {
        Object.keys(item).forEach((key) => {
          if (!["Cảng", "Group", "Guide", "TT", "STT", "ExpectedTotal", "Balance in cash", "__bookingId"].includes(key)) {
            allKeys.add(key);
          }
        });
      });
      const dataColumns = ["TT", ...Array.from(allKeys), "Balance in cash"];
      const resultsByPort: Record<string, any[]> = {};
      result.forEach((item) => {
        const port = String(item.Cảng || "N/A").trim();
        if (!resultsByPort[port]) resultsByPort[port] = [];
        resultsByPort[port].push(item);
      });

      const usedSheetNames = new Set<string>();
      for (const portName of portOrder) {
        if (!resultsByPort[portName]) continue;
        const baseName = portName.replace(/[\\/?*[\]]/g, "").substring(0, 31).trim() || "Sheet";
        let sheetName = baseName;
        let nameCounter = 1;
        while (usedSheetNames.has(sheetName.toLowerCase())) {
          const suffix = ` (${nameCounter})`;
          sheetName = baseName.substring(0, 31 - suffix.length) + suffix;
          nameCounter++;
        }
        usedSheetNames.add(sheetName.toLowerCase());

        const sheet = workbook.addWorksheet(sheetName);
        const portData = resultsByPort[portName];
        sheet.columns = dataColumns.map((key) => ({
          key,
          width: getColumnContentWidth(key, portData),
        }));
        let currentGroup = "";
        let counter = 1;
        const actualCounts: Record<string, number> = {};
        portData.forEach((item) => {
          const group = item.Group || "N/A";
          actualCounts[group] = (actualCounts[group] || 0) + 1;
        });

        portData.forEach((item) => {
          const group = item.Group || "N/A";
          const expectedTotal = item.ExpectedTotal || 0;
          const actualCount = actualCounts[group] || 0;
          const isMismatch = expectedTotal > 0 && actualCount !== expectedTotal;

          if (group !== currentGroup) {
            if (currentGroup) sheet.addRow([]);
            const sectionHeader = sheet.addRow([
              `GROUP: ${group.toUpperCase()}${isMismatch ? ` (MISMATCH: Expected ${expectedTotal}, Got ${actualCount})` : ""}`,
            ]);
            sectionHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
            sectionHeader.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: isMismatch ? "FFFF0000" : "FF4F81BD" },
            };
            sheet.mergeCells(sectionHeader.number, 1, sectionHeader.number, dataColumns.length);

            const guideRow = sheet.addRow([item.Guide ? `Guide Information: ${item.Guide}` : "Guide Information:"]);
            guideRow.font = { italic: true };
            sheet.mergeCells(guideRow.number, 1, guideRow.number, dataColumns.length);

            const tableHeaderRow = sheet.addRow(dataColumns);
            tableHeaderRow.font = { bold: true };
            tableHeaderRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
            currentGroup = group;
            counter = 1;
          }

          const rowData: any = { TT: counter++ };
          dataColumns.forEach((key) => {
            if (key !== "TT") rowData[key] = item[key];
          });
          sheet.addRow(rowData);
        });

        sheet.eachRow((row) => {
          row.eachCell({ includeEmpty: true }, (cell) => {
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
            cell.alignment = { vertical: "middle", wrapText: true };
          });
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `Danh_sach_tau_bien_chi_tiet_${new Date().getTime()}.xlsx`,
      );
    } catch (err: any) {
      console.error("Cruise processing error:", err);
      setError(err.message || "Có lỗi xảy ra khi xử lý danh sách.");
    } finally {
      setIsProcessing(false);
    }
  };

  const uploadCard = (
    label: string,
    file: File | null,
    inputRef: React.RefObject<HTMLInputElement | null>,
    setFile: (file: File | null) => void,
    isDragging: boolean,
    setDragging: (value: boolean) => void,
    icon: "upload" | "file",
  ) => (
    <div className="space-y-3">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>
      <div
        className={`flex h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white p-6 text-center shadow-sm transition-all outline-none focus:ring-4 focus:ring-primary/10 ${
          isDragging ? "border-primary bg-primary/5" : "border-slate-200 hover:border-primary/50 hover:bg-slate-50"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (event.dataTransfer.files[0]) setFile(event.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
        tabIndex={0}
      >
        <input
          type="file"
          ref={inputRef}
          className="hidden"
          accept=".xlsx,.xls"
          onChange={(event) => {
            if (event.target.files?.[0]) setFile(event.target.files[0]);
            event.target.value = "";
          }}
        />
        {file ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={28} />
            </div>
            <p className="max-w-[220px] truncate text-sm font-bold text-slate-900">{file.name}</p>
            <button
              onClick={(event) => {
                event.stopPropagation();
                setFile(null);
              }}
              className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-100"
            >
              Thay đổi file
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner transition-transform group-hover:scale-105">
              {icon === "upload" ? <Upload size={30} /> : <FileText size={30} />}
            </div>
            <h3 className="mb-1 font-bold text-slate-950">Kéo thả file Excel</h3>
            <p className="text-xs text-slate-500">hoặc click để chọn file .xlsx</p>
          </>
        )}
      </div>
    </div>
  );

  return (
    <motion.div
      key="cruise-ship-mode"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <div className="text-xs font-bold uppercase tracking-wider text-primary">
            Tàu biển
          </div>
          <h2 className="mt-1 text-xl font-bold text-slate-950">
            Ghép danh sách khách theo cảng
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Upload file FULL và file TÓM TẮT để xuất danh sách chi tiết.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {uploadCard("1. File danh sách FULL (Excel)", fullList, fullInputRef, setFullList, isDraggingFull, setIsDraggingFull, "upload")}
        {uploadCard("2. File danh sách TÓM TẮT (Excel)", summaryList, summaryInputRef, setSummaryList, isDraggingSummary, setIsDraggingSummary, "file")}
        </div>
      </div>

      {fullList && summaryList && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
          <button
            disabled={isProcessing}
            className="group inline-flex h-12 items-center gap-3 rounded-xl bg-primary px-8 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90 disabled:opacity-50"
            onClick={processCruiseShip}
          >
            {isProcessing ? (
              <>
                <Loader2 size={22} className="animate-spin" /> Đang xử lý...
              </>
            ) : (
              <>
                <Sparkles size={22} className="text-accent group-hover:rotate-12 transition-transform" />
                Xuất danh sách khách
              </>
            )}
          </button>
        </motion.div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
          >
            <AlertCircle size={16} /> {error}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
