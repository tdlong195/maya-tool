import { AlertCircle, FileText, Loader2, Sparkles, Upload } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import PizZip from "pizzip";
import { saveAs } from "file-saver";

export function TripNoteFeature() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptFile = (nextFile?: File) => {
    if (!nextFile) return;
    if (!nextFile.name.endsWith(".docx") && !nextFile.name.endsWith(".doc")) {
      setError("Vui lòng chọn file .docx hoặc .doc");
      return;
    }
    setFile(nextFile);
    setError(null);
  };

  const processTripNote = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      if (file.name.toLowerCase().endsWith(".doc")) {
        throw new Error(
          "Hệ thống chỉ hỗ trợ xử lý file .docx chuyên sâu. Vui lòng lưu file .doc thành .docx trước khi thực hiện.",
        );
      }

      const zip = new PizZip(await file.arrayBuffer());
      const parser = new DOMParser();
      const serializer = new XMLSerializer();

      const processXmlContent = (xmlString: string, removeSections = false) => {
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");

        const drawings = xmlDoc.getElementsByTagName("w:drawing");
        while (drawings.length > 0) drawings[0].parentNode?.removeChild(drawings[0]);

        const picts = xmlDoc.getElementsByTagName("w:pict");
        while (picts.length > 0) picts[0].parentNode?.removeChild(picts[0]);

        if (removeSections) {
          const body = xmlDoc.getElementsByTagName("w:body")[0];
          if (body) {
            const children = Array.from(body.childNodes);
            let removing = false;
            const keywords = ["TRIP PRICING", "ACCOMMODATION"];

            children.forEach((child) => {
              const textContent = child.textContent || "";
              const isHeaderParagraph =
                child.nodeName === "w:p" &&
                /^[ \t]*[IVX0-9]{1,5}\.\s+|[0-9]{1,2}\.\s+/i.test(textContent);

              if (isHeaderParagraph) {
                const foundKeyword = keywords.some((kw) =>
                  textContent.toUpperCase().includes(kw),
                );
                if (foundKeyword) removing = true;
                else if (removing) removing = false;
              }

              if (removing) body.removeChild(child);
            });
          }
        }

        return serializer.serializeToString(xmlDoc);
      };

      const docPath = "word/document.xml";
      if (zip.file(docPath)) {
        zip.file(docPath, processXmlContent(zip.file(docPath)!.asText(), true));
      }

      Object.keys(zip.files).forEach((path) => {
        if (path.startsWith("word/header") || path.startsWith("word/footer")) {
          zip.file(path, processXmlContent(zip.file(path)!.asText(), false));
        }
      });

      Object.keys(zip.files).forEach((path) => {
        if (path.startsWith("word/media/")) delete zip.files[path];
      });

      Object.keys(zip.files).forEach((path) => {
        if (!path.endsWith(".xml.rels")) return;
        const relFile = zip.file(path);
        if (!relFile) return;
        zip.file(
          path,
          relFile
            .asText()
            .replace(
              /<Relationship [^>]*Type="http:\/\/schemas\.openxmlformats\.org\/officeDocument\/2006\/relationships\/image"[^>]*\/>/g,
              "",
            ),
        );
      });

      saveAs(zip.generate({ type: "blob", compression: "DEFLATE" }), "trip_note.docx");
    } catch (err: any) {
      console.error("Trip note processing error:", err);
      setError(err.message || "Có lỗi xảy ra khi xử lý file trip note.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      key="trip-note-mode"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto"
    >
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-6 text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-primary">
            Trip note
          </div>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">
            Xử lý Trip Note
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Remove toàn bộ hình ảnh trong file Trip Note để tối ưu dung lượng và định dạng.
          </p>
        </div>

        <div
          className={`group relative flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-300 ${
            isDragging
              ? "border-primary bg-primary/5 ring-4 ring-primary/5"
              : file
                ? "border-secondary/30 bg-secondary/5"
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
          onClick={() => inputRef.current?.click()}
        >
          <input
            type="file"
            ref={inputRef}
            className="hidden"
            accept=".doc,.docx"
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />

          {file ? (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <div className="mb-4 rounded-2xl bg-secondary/10 p-4 text-secondary">
                <FileText size={36} />
              </div>
              <span className="mb-1 max-w-[300px] truncate text-base font-bold text-secondary">
                {file.name}
              </span>
              <span className="text-xs text-slate-400">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="mt-5 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-100"
              >
                Chọn file khác
              </button>
            </div>
          ) : (
            <>
              <div className="mb-5 rounded-2xl bg-primary/10 p-4 text-primary transition-transform duration-300 group-hover:scale-105">
                <Upload size={34} />
              </div>
              <p className="mb-2 text-lg font-bold text-slate-800">
                Kéo thả file Trip Note vào đây
              </p>
              <p className="text-sm text-slate-400">Hỗ trợ định dạng .docx và .doc</p>
            </>
          )}
        </div>

        {error && (
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <button
            onClick={processTripNote}
            disabled={!file || isProcessing}
            className={`inline-flex h-12 items-center gap-3 rounded-xl px-8 text-sm font-bold shadow-lg transition-colors ${
              !file || isProcessing
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-primary text-white shadow-primary/20 hover:bg-primary/90"
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                Đang xử lý...
              </>
            ) : (
              <>
                <Sparkles size={24} />
                Xử lý (Remove ảnh)
              </>
            )}
          </button>
        </div>

        <div className="mt-6 flex gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p>
            Lưu ý: File .doc cũ có thể bị lỗi khi xử lý. Nếu file của bạn là .doc, hãy Save As sang .docx để đạt hiệu quả tốt nhất.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
