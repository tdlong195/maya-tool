import { Type } from "@google/genai";
import {
  AlertCircle,
  Image as ImageIcon,
  Loader2,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { CITY_OPTIONS } from "../constants/cities";
import { ai } from "../services/gemini";
import type { GuideData } from "../types/domain";

const emptyGuide: GuideData = {
  Id: "",
  City: "",
  Name: "",
  Address: "",
  DoB: "",
  Sex: "",
  idNumber: "",
  Expire: "",
  GuideID: "",
  GuideExpire: "",
  sdt: "",
  stk: "",
};

const nextGuideCode = (guides: GuideData[]) => {
  const max = guides.reduce((value, guide) => {
    const match = guide.Id?.match(/^HDV[-_ ]?(\d+)$/i);
    return match ? Math.max(value, Number(match[1])) : value;
  }, 0);
  return `HDV${String(max + 1).padStart(3, "0")}`;
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
  });

const normalizeGender = (value?: string) => {
  const lowered = (value || "").toLowerCase();
  if (lowered.includes("nam") || value === "M") return "M";
  if (lowered.includes("nữ") || lowered.includes("nu") || value === "F") return "F";
  return value || "";
};

const toDateInputValue = (value?: string) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return "";
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

export function createEmptyGuide(existingGuides: GuideData[]) {
  return {
    ...emptyGuide,
    Id: nextGuideCode(existingGuides),
  };
}

export function GuideEditorModal({
  title,
  description = "Trích xuất từ CCCD/thẻ HDV hoặc nhập thủ công rồi lưu vào Database.",
  initialGuide,
  existingGuides,
  saveLabel = "Lưu vào Database",
  onClose,
  onSave,
}: {
  title: string;
  description?: string;
  initialGuide?: GuideData;
  existingGuides: GuideData[];
  saveLabel?: string;
  onClose: () => void;
  onSave: (guide: GuideData) => void;
}) {
  const [draft, setDraft] = useState<GuideData>(
    initialGuide || createEmptyGuide(existingGuides),
  );
  const [idCard, setIdCard] = useState<File | null>(null);
  const [guideCard, setGuideCard] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idInputRef = useRef<HTMLInputElement>(null);
  const guideInputRef = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<GuideData>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const extractGuide = async () => {
    if (!idCard || !guideCard) {
      setError("Vui lòng chọn đủ ảnh CCCD và thẻ HDV.");
      return;
    }

    setIsExtracting(true);
    setError(null);
    try {
      const [idCardBase64, guideCardBase64] = await Promise.all([
        fileToBase64(idCard),
        fileToBase64(guideCard),
      ]);
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                text: "Trích xuất thông tin từ ảnh CCCD và thẻ hướng dẫn viên du lịch. Trả JSON thuần với các trường: fullName, gender, idNumber, dob, address, han_can_cuoc, guideCardNumber, guideCardExpire. Địa chỉ phải là nơi thường trú trên CCCD, không lấy quê quán.",
              },
              { inlineData: { mimeType: idCard.type, data: idCardBase64 } },
              { inlineData: { mimeType: guideCard.type, data: guideCardBase64 } },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              fullName: { type: Type.STRING },
              gender: { type: Type.STRING },
              idNumber: { type: Type.STRING },
              dob: { type: Type.STRING },
              address: { type: Type.STRING },
              han_can_cuoc: { type: Type.STRING },
              guideCardNumber: { type: Type.STRING },
              guideCardExpire: { type: Type.STRING },
            },
          },
        },
      });
      const rawText = response.text || "{}";
      const jsonText =
        rawText.match(/```json\s*([\s\S]*?)```/i)?.[1] ||
        rawText.match(/```\s*([\s\S]*?)```/i)?.[1] ||
        rawText;
      const extracted = JSON.parse(jsonText.trim());
      update({
        Name: extracted.fullName || draft.Name,
        Sex: normalizeGender(extracted.gender) || draft.Sex,
        idNumber: extracted.idNumber || draft.idNumber,
        DoB: extracted.dob || draft.DoB,
        Address: extracted.address || draft.Address,
        Expire: extracted.han_can_cuoc || draft.Expire,
        GuideID: extracted.guideCardNumber || draft.GuideID,
        GuideExpire: extracted.guideCardExpire || draft.GuideExpire,
      });
    } catch (err: any) {
      console.error("Guide extraction error:", err);
      setError(err.message || "Không trích xuất được thông tin HDV.");
    } finally {
      setIsExtracting(false);
    }
  };

  const saveGuide = () => {
    if (!draft.Name.trim()) {
      setError("Tên HDV là bắt buộc.");
      return;
    }
    onSave({
      ...draft,
      Id: draft.Id || nextGuideCode(existingGuides),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="flex max-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl shadow-slate-950/20"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-xl font-serif italic text-secondary">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              <AlertCircle size={17} /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UploadBox label="Ảnh CCCD" file={idCard} inputRef={idInputRef} onFile={setIdCard} />
            <UploadBox label="Thẻ HDV" file={guideCard} inputRef={guideInputRef} onFile={setGuideCard} />
          </div>

          <button
            onClick={extractGuide}
            disabled={!idCard || !guideCard || isExtracting}
            className="w-full rounded-2xl bg-secondary px-4 py-3 text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {isExtracting ? (
              <>
                <Loader2 size={17} className="animate-spin" /> Đang trích xuất...
              </>
            ) : (
              <>
                <Sparkles size={17} /> Trích xuất vào form
              </>
            )}
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GuideField label="ID" value={draft.Id} onChange={() => undefined} readOnly />
            <GuideCityField value={draft.City} onChange={(City) => update({ City })} />
            <GuideField label="Tên HDV" value={draft.Name} onChange={(Name) => update({ Name })} />
            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Giới tính</span>
              <select
                value={draft.Sex}
                onChange={(event) => update({ Sex: event.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-4 focus:ring-primary/10"
              >
                <option value="">Chọn giới tính</option>
                <option value="M">Nam</option>
                <option value="F">Nữ</option>
              </select>
            </label>
            <div className="md:col-span-2">
              <GuideField label="Địa chỉ thường trú" value={draft.Address} onChange={(Address) => update({ Address })} />
            </div>
            <GuideField label="Ngày sinh" type="date" value={toDateInputValue(draft.DoB)} onChange={(DoB) => update({ DoB })} />
            <GuideField label="CCCD" value={draft.idNumber} onChange={(idNumber) => update({ idNumber })} />
            <GuideField label="Hạn CCCD" type="date" value={toDateInputValue(draft.Expire)} onChange={(Expire) => update({ Expire })} />
            <GuideField label="Thẻ HDV" value={draft.GuideID} onChange={(GuideID) => update({ GuideID })} />
            <GuideField label="Hạn thẻ HDV" type="date" value={toDateInputValue(draft.GuideExpire)} onChange={(GuideExpire) => update({ GuideExpire })} />
            <GuideField label="SĐT" value={draft.sdt} onChange={(sdt) => update({ sdt })} />
            <GuideField label="STK" value={draft.stk} onChange={(stk) => update({ stk })} />
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600">
            Hủy
          </button>
          <button onClick={saveGuide} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white flex items-center gap-2">
            <Save size={17} /> {saveLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function UploadBox({
  label,
  file,
  inputRef,
  onFile,
}: {
  label: string;
  file: File | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const picked = event.dataTransfer.files?.[0];
        if (picked && picked.type.startsWith("image/")) onFile(picked);
      }}
      className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-left transition-all hover:border-primary/50 hover:bg-primary/5"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const picked = event.target.files?.[0];
          if (picked) onFile(picked);
          event.currentTarget.value = "";
        }}
      />
      <div className="flex items-center gap-2 font-bold text-slate-800">
        <ImageIcon size={18} className="text-primary" />
        {label}
      </div>
      <div className="mt-2 truncate text-sm text-slate-500">
        {file ? file.name : "Chọn ảnh hoặc kéo file vào đây"}
      </div>
    </button>
  );
}

function GuideField({
  label,
  value,
  onChange,
  readOnly,
  type = "text",
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  type?: "text" | "date";
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <input
        type={type}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        readOnly={readOnly}
        className={`w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-4 focus:ring-primary/10 ${
          readOnly ? "bg-slate-100 font-mono text-slate-500" : "bg-white"
        }`}
      />
    </label>
  );
}

function GuideCityField({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Thành phố</span>
      <select
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-4 focus:ring-primary/10"
      >
        <option value="">Chọn thành phố</option>
        {CITY_OPTIONS.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>
    </label>
  );
}
