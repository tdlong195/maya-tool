import { ThinkingLevel } from "@google/genai";
import { AlertCircle, CheckCircle2, Copy, Languages, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ai } from "../../shared/services/gemini";

const normalizeTranslatedText = (rawText: string) => {
  let text = rawText.trim();
  text = text.replace(/(^|\n)(\s*)(Ngày \d+[\s.\-:]+)/gm, "$1$2**$3**");
  text = text.replace(/\*\*(\s*\*\*Ngày \d+[\s.\-:]+\*\*\s*)\*\*/g, "$1");
  return text.replace(/\*{3,}/g, "**");
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export function TranslateFeature() {
  const [translateInput, setTranslateInput] = useState("");
  const [translateResult, setTranslateResult] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [copiedTranslate, setCopiedTranslate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copyTranslateToClipboard = async (textToCopy?: string) => {
    const rawText = textToCopy || translateResult;
    if (!rawText) return;

    const text = normalizeTranslatedText(rawText);
    const htmlContent = text
      .split("\n")
      .map((line) => {
        const escaped = escapeHtml(line);
        const boldedLine = escaped.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
        return `<p style="margin: 0 0 12pt 0; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5;">${boldedLine}</p>`;
      })
      .join("");

    const fullHtml = `<html><head><meta charset="utf-8"><style>p { margin-bottom: 12pt; } b { font-weight: bold; }</style></head><body>${htmlContent}</body></html>`;

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([fullHtml], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
      setCopiedTranslate(true);
      setTimeout(() => setCopiedTranslate(false), 2000);
    } catch (err) {
      console.error("Clipboard API error:", err);
      await navigator.clipboard.writeText(text);
      setCopiedTranslate(true);
      setTimeout(() => setCopiedTranslate(false), 2000);
    }
  };

  const handleTranslate = async () => {
    if (!translateInput.trim()) {
      setError("Vui lòng nhập nội dung cần dịch.");
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      const prompt = `Dịch và tóm tắt nội dung chương trình tour sau sang tiếng Việt.
Yêu cầu:
- Chỉ dịch và tóm tắt đúng, đủ nội dung được cung cấp.
- Không thêm nội dung khác ngoài file.
- Dịch sát nghĩa, chuyên nghiệp, ngắn gọn nhưng đầy đủ ý chính.
- Trình bày rõ ràng theo từng ngày hoặc từng mục.
- Chỉ in đậm tiêu đề của các ngày, ví dụ: **Ngày 1:**.
- Trả về kết quả là văn bản Markdown, không thêm giải thích.

Nội dung cần dịch:
${translateInput}`;

      const response = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
      });

      let fullText = "";
      setTranslateResult("");
      for await (const chunk of response) {
        fullText += chunk.text;
        setTranslateResult(fullText);
      }

      copyTranslateToClipboard(fullText);
    } catch (err: any) {
      console.error("Translate error:", err);
      setError(err.message || "Có lỗi xảy ra khi dịch.");
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <motion.div
      key="translate-mode"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-black/5">
        <h2 className="text-2xl font-serif italic mb-6">
          Dịch chương trình sang tiếng Việt
        </h2>

        <div className="space-y-4 mb-8">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-medium">
              Nội dung tour cần dịch
            </label>
            <textarea
              placeholder="Dán nội dung chương trình tour tại đây..."
              className="w-full px-6 py-4 rounded-2xl border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all min-h-[250px] resize-y font-sans leading-relaxed"
              value={translateInput}
              onChange={(e) => setTranslateInput(e.target.value)}
            />
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleTranslate}
              disabled={isTranslating || !translateInput.trim()}
              className="bg-[#141414] text-white px-12 py-4 rounded-full font-medium text-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-3 shadow-xl"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="animate-spin" /> Đang dịch...
                </>
              ) : (
                <>
                  <Languages size={20} /> Dịch sang tiếng Việt
                </>
              )}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg text-sm mb-6"
            >
              <AlertCircle size={16} /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {translateResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 border-t border-gray-100 pt-8"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-serif italic">Kết quả dịch</h3>
                <button
                  onClick={() => copyTranslateToClipboard()}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm ${
                    copiedTranslate
                      ? "bg-emerald-500 text-white"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {copiedTranslate ? (
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
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {translateResult}
                </ReactMarkdown>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
