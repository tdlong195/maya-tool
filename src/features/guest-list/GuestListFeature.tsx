import { AlertCircle, CheckCircle2, Copy, Download, FileText, Image as ImageIcon, Loader2, Sparkles, Trash2, Upload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { ai } from "../../shared/services/gemini";

interface GuestData {
  lastName: string;
  firstName: string;
  dob: string;
  gender: string;
  nationality: string;
  idNumber: string;
  expiryDate: string;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
  });

const normalizeGuest = (data: any): GuestData => {
  const normalized: GuestData = {
    lastName: data.lastName?.trim() || "_",
    firstName: data.firstName?.trim() || "_",
    dob: data.dob?.trim() || "_",
    gender: "_",
    nationality: data.nationality?.trim() || "_",
    idNumber: data.idNumber?.trim() || "_",
    expiryDate: data.expiryDate?.trim() || "_",
  };

  if (data.gender) {
    const gender = String(data.gender).toLowerCase();
    if (gender.includes("nam") || gender === "m" || gender.includes("male")) normalized.gender = "M";
    else if (gender.includes("nữ") || gender === "f" || gender.includes("female")) normalized.gender = "F";
  }
  return normalized;
};

export function GuestListFeature() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Array<string | null>>([]);
  const [guests, setGuests] = useState<GuestData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState({ current: 0, total: 0, isBackingOff: false });

  useEffect(() => {
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview));
  }, [previews]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      const files: File[] = [];
      const items = event.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file") {
          const file = items[i].getAsFile();
          if (file?.type.startsWith("image/")) files.push(file);
        }
      }
      if (files.length > 0) {
        event.preventDefault();
        addFiles(files);
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const addFiles = (files: File[]) => {
    const validFiles = files.filter(
      (file) => file.type.startsWith("image/") || file.type === "application/pdf",
    );
    if (validFiles.length === 0) return;
    setFiles((prev) => [...prev, ...validFiles]);
    setPreviews((prev) => [
      ...prev,
      ...validFiles.map((file) =>
        file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      ),
    ]);
    setError(null);
  };

  const removeFile = (index: number) => {
    if (previews[index]) URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
    setPreviews((prev) => prev.filter((_, idx) => idx !== index));
  };

  const clearAll = () => {
    previews.forEach((preview) => URL.revokeObjectURL(preview));
    setFiles([]);
    setPreviews([]);
    setGuests([]);
    setError(null);
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const processFile = async (file: File, retries = 5, backoff = 5000): Promise<GuestData | null> => {
    try {
      const base64 = await fileToBase64(file);
      const prompt = `Hãy trích xuất chính xác thông tin từ file Hộ chiếu hoặc CCCD này. File có thể là ảnh hoặc PDF.
Trả JSON với các trường:
{
  "lastName": "Họ và tên đệm",
  "firstName": "Tên",
  "dob": "Ngày sinh dd/mm/yyyy",
  "gender": "M/F",
  "nationality": "Quốc tịch",
  "idNumber": "Số hộ chiếu hoặc CCCD",
  "expiryDate": "Ngày hết hạn dd/mm/yyyy"
}
Nếu không tìm thấy trường nào, trả "_".`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: file.type, data: base64 } },
          ],
        },
        config: { responseMimeType: "application/json" },
      });

      return response.text ? normalizeGuest(JSON.parse(response.text)) : null;
    } catch (err: any) {
      const message = err.message || "";
      const shouldRetry =
        (message.includes("429") || message.includes("Quota") || message.includes("503") || message.includes("unavailable")) &&
        retries > 0;
      if (shouldRetry) {
        setStatus((prev) => ({ ...prev, isBackingOff: true }));
        await sleep(backoff);
        setStatus((prev) => ({ ...prev, isBackingOff: false }));
        return processFile(file, retries - 1, backoff * 2);
      }
      throw err;
    }
  };

  const processGuestList = async () => {
    if (files.length === 0) {
      setError("Vui lòng tải lên ít nhất một ảnh hoặc PDF (Hộ chiếu/CCCD) của khách.");
      return;
    }

    setIsProcessing(true);
    setGuests([]);
    setError(null);
    setStatus({ current: 0, total: files.length, isBackingOff: false });

    try {
      for (let i = 0; i < files.length; i++) {
        setStatus((prev) => ({ ...prev, current: i + 1, isBackingOff: false }));
        try {
          const guest = await processFile(files[i]);
          if (guest) setGuests((prev) => [...prev, guest]);
        } catch (err: any) {
          console.error(`Error processing file ${i}:`, err);
          if (err.message?.includes("429") || err.message?.includes("Quota")) {
            setError("Đã đạt giới hạn yêu cầu. Vui lòng chờ rồi thử lại với các ảnh còn lại.");
            break;
          }
        }
        await sleep(1000);
      }
    } catch (err: any) {
      console.error("Guest processing fatal error:", err);
      setError(`Lỗi nghiêm trọng khi xử lý: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setStatus((prev) => ({ ...prev, isBackingOff: false }));
    }
  };

  const copyGuestsToClipboard = () => {
    if (guests.length === 0) return;
    const content = guests
      .map((guest, idx) =>
        [idx + 1, guest.lastName, guest.firstName, guest.gender, guest.dob, guest.nationality, guest.idNumber, guest.expiryDate].join("\t"),
      )
      .join("\n");
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const exportGuestsToExcel = () => {
    if (guests.length === 0) return;
    const exportData = guests.map((guest, idx) => ({
      STT: idx + 1,
      Họ: guest.lastName,
      Tên: guest.firstName,
      "Giới tính": guest.gender,
      "Ngày sinh": guest.dob,
      "Quốc tịch": guest.nationality,
      "Số hộ chiếu": guest.idNumber,
      "Ngày hết hạn": guest.expiryDate,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sách khách");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `Danh_sach_khach_${new Date().getTime()}.xlsx`,
    );
  };

  return (
    <motion.div
      key="guest-list-mode"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <div
          className={`flex min-h-60 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white p-8 text-center transition-all ${
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
            addFiles(Array.from(event.dataTransfer.files));
          }}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="image/*,application/pdf,.pdf"
            multiple
            onChange={(event) => {
              addFiles(Array.from(event.target.files || []));
              event.target.value = "";
            }}
          />
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Upload size={30} />
          </div>
          <h3 className="mb-1 text-lg font-bold text-slate-950">Kéo thả hoặc chọn file khách</h3>
          <p className="max-w-md text-sm leading-6 text-slate-500">Hỗ trợ ảnh hoặc PDF hộ chiếu/CCCD, có thể chọn nhiều file</p>
        </div>

        {files.length > 0 && (
          <div className="mt-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-950">{files.length} file đã chọn</h3>
              <button onClick={clearAll} className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-100">
                <Trash2 size={16} /> Xoá tất cả
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {files.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {previews[idx] ? (
                    <img src={previews[idx] || ""} alt={`Guest ${idx + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                      <FileText size={36} className="text-red-600 mb-2" />
                      <div className="max-w-full truncate text-sm font-bold text-slate-700">
                        {file.name}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">PDF</div>
                    </div>
                  )}
                  <button
                    onClick={() => removeFile(idx)}
                    className="absolute right-2 top-2 rounded-xl bg-white/90 p-2 text-red-600 shadow-sm transition-colors hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-center">
              <button
                onClick={processGuestList}
                disabled={isProcessing}
                className="inline-flex h-12 items-center gap-3 rounded-xl bg-primary px-8 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={22} className="animate-spin" />
                    {status.isBackingOff ? "Đang chờ quota..." : `Đang xử lý ${status.current}/${status.total}`}
                  </>
                ) : (
                  <>
                    <Sparkles size={22} /> Trích xuất danh sách khách
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-5 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
            >
              <AlertCircle size={16} /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        {guests.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-5">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-primary">
                  Kết quả
                </div>
                <h3 className="mt-1 text-xl font-bold text-slate-950">Danh sách khách</h3>
              </div>
              <div className="flex gap-3">
                <button onClick={copyGuestsToClipboard} className="inline-flex h-11 items-center gap-2 rounded-xl bg-secondary px-4 text-sm font-bold text-white transition-colors hover:bg-secondary/90">
                  {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                  {copied ? "Đã copy" : "Copy"}
                </button>
                <button onClick={exportGuestsToExcel} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white transition-colors hover:bg-primary/90">
                  <Download size={18} /> Xuất Excel
                </button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    {["STT", "Họ", "Tên", "Giới tính", "Ngày sinh", "Quốc tịch", "Số giấy tờ", "Hết hạn"].map((header) => (
                      <th key={header} className="px-4 py-3 font-semibold">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {guests.map((guest, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3">{idx + 1}</td>
                      <td className="px-4 py-3">{guest.lastName}</td>
                      <td className="px-4 py-3">{guest.firstName}</td>
                      <td className="px-4 py-3">{guest.gender}</td>
                      <td className="px-4 py-3">{guest.dob}</td>
                      <td className="px-4 py-3">{guest.nationality}</td>
                      <td className="px-4 py-3 font-mono">{guest.idNumber}</td>
                      <td className="px-4 py-3">{guest.expiryDate}</td>
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
