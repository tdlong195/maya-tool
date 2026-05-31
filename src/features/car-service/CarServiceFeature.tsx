import { ThinkingLevel } from "@google/genai";
import { AlertCircle, Car, CheckCircle2, Copy, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ai } from "../../shared/services/gemini";
import mammoth from "mammoth";

export function CarServiceFeature() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const processFile = async (fileToProcess: File) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const extracted = await mammoth.extractRawText({
        arrayBuffer: await fileToProcess.arrayBuffer(),
      });
      const text = extracted.value;
      if (!text.trim()) throw new Error("Không thể trích xuất nội dung từ file.");

      const prompt = `Dựa trên nội dung chương trình tour sau, hãy trích xuất các thông tin liên quan đến dịch vụ xe ô tô.
Yêu cầu:
- Chỉ trích xuất các ngày diễn ra tại Việt Nam.
- Nếu một ngày có cả tiễn sân bay và đón sân bay, tách riêng thành 2 dòng.
- Trình bày dưới dạng bảng Markdown với các cột: Thành phố, Ngày tháng năm, Giờ đón, Lịch trình, Điểm đón, Điểm trả.
- Nếu có số lượng khách hoặc yêu cầu đặc biệt về xe, liệt kê thêm ở phần ghi chú.
- Trả về Markdown, không thêm giải thích.

Nội dung chương trình:
${text}`;

      const response = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
      });

      let fullText = "";
      for await (const chunk of response) {
        fullText += chunk.text;
        setResult(fullText);
      }
    } catch (err: any) {
      console.error("Car service processing error:", err);
      setError(err.message || "Có lỗi xảy ra khi xử lý file dịch vụ xe.");
    } finally {
      setIsProcessing(false);
    }
  };

  const acceptFile = (nextFile?: File) => {
    if (!nextFile) return;
    if (!nextFile.name.endsWith(".doc") && !nextFile.name.endsWith(".docx")) {
      setError("Vui lòng tải lên file .doc hoặc .docx");
      return;
    }
    setFile(nextFile);
    processFile(nextFile);
  };

  return (
    <motion.div
      key="car-service-mode"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-secondary/5 border border-black/5">
        <h2 className="text-2xl font-serif italic text-secondary mb-6 flex items-center gap-2">
          <Car className="text-primary" size={28} /> Dịch vụ xe oto
        </h2>

        <div
          className={`bg-white p-12 rounded-[2rem] shadow-xl shadow-secondary/5 border-2 border-dashed transition-all flex flex-col items-center text-center group cursor-pointer outline-none focus:ring-4 focus:ring-primary/10 h-64 justify-center ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-slate-200 hover:border-primary/50 hover:bg-slate-50"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            acceptFile(e.dataTransfer.files[0]);
          }}
          onClick={() => document.getElementById("car-service-file")?.click()}
        >
          <input
            id="car-service-file"
            type="file"
            className="hidden"
            accept=".doc,.docx"
            onChange={(e) => {
              acceptFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all shadow-inner ${
              isProcessing
                ? "bg-primary/10 text-primary"
                : file
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-primary/10 text-primary"
            }`}
          >
            {isProcessing ? (
              <Loader2 className="animate-spin" size={32} />
            ) : file ? (
              <CheckCircle2 size={32} />
            ) : (
              <Car size={32} />
            )}
          </div>
          <h3 className="text-xl font-bold text-secondary mb-2">
            {isProcessing
              ? "Đang xử lý file..."
              : file
                ? file.name
                : "Kéo thả file chương trình tour"}
          </h3>
          <p className="text-gray-400 text-sm">Hỗ trợ file .doc, .docx</p>
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

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 border-t border-gray-100 pt-8 mt-8"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-serif italic">Kết quả trích xuất</h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm ${
                    copied ? "bg-emerald-500 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 size={16} /> Đã copy!
                    </>
                  ) : (
                    <>
                      <Copy size={16} /> Copy nội dung
                    </>
                  )}
                </button>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 leading-relaxed text-gray-800 prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
