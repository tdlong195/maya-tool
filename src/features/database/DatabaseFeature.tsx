import { Type } from "@google/genai";
import { saveAs } from "file-saver";
import ExcelJS from "exceljs";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Download,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { ai, isGeminiConfigured, localDatabase } from "../../shared/services";
import type { GuideData, Restaurant } from "../../shared/types/domain";
import { isExpired, removeAccents } from "../../shared/utils";

type DbTab = "guides" | "restaurants";

const PAGE_SIZE = 10;

type ExtractedGuide = {
  fullName?: string;
  gender?: string;
  idNumber?: string;
  dob?: string;
  address?: string;
  han_can_cuoc?: string;
  guideCardNumber?: string;
  guideCardExpire?: string;
};

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

const emptyRestaurant: Restaurant = {
  id: "",
  city: "",
  name: "",
  address: "",
  phone: "",
  email: "",
  contactPerson: "",
  note: "",
};

const getCell = (row: Record<string, unknown>, aliases: string[]) => {
  const key = Object.keys(row).find((candidate) =>
    aliases.some(
      (alias) =>
        removeAccents(candidate.toLowerCase().trim()) ===
        removeAccents(alias.toLowerCase()),
    ),
  );
  return key ? String(row[key] ?? "").trim() : "";
};

const nextCode = (prefix: string, ids: string[]) => {
  const max = ids.reduce((value, id) => {
    const match = id.match(new RegExp(`^${prefix}[-_ ]?(\\d+)$`, "i"));
    return match ? Math.max(value, Number(match[1])) : value;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
  });

const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const getGeminiErrorMessage = (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  if (message.toLowerCase().includes("api key")) {
    return "Gemini API key chưa đúng hoặc chưa được cấu hình.";
  }
  if (message.includes("429")) {
    return "Gemini đang giới hạn lượt gọi. Vui lòng thử lại sau.";
  }
  if (message.includes("400")) {
    return "Gemini không đọc được định dạng ảnh này. Hãy thử ảnh JPG, PNG hoặc WebP rõ nét hơn.";
  }
  return message || "Không trích xuất được ảnh. Vui lòng thử lại.";
};

const normalizeGender = (value?: string) => {
  const lowered = (value || "").toLowerCase();
  if (lowered.includes("nam") || value === "M") return "M";
  if (lowered.includes("nữ") || lowered.includes("nu") || value === "F") {
    return "F";
  }
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

const formatDateForExport = (value?: string) => {
  if (!value) return "";
  const inputValue = toDateInputValue(value);
  if (!inputValue) return value;
  const [year, month, day] = inputValue.split("-");
  return `${day}/${month}/${year}`;
};

const normalizeGuide = (
  row: Record<string, unknown>,
  index: number,
  fallbackId: string,
): GuideData => ({
  Id: getCell(row, ["Id", "ID", "Mã HDV"]) || `${fallbackId}-${index + 1}`,
  City: getCell(row, ["City", "Thành phố", "Tinh", "Tỉnh"]),
  Name: getCell(row, ["Name", "Tên", "Họ và tên", "Ho va ten"]),
  Address: getCell(row, ["Address", "Địa chỉ", "Dia chi"]),
  DoB: getCell(row, ["DoB", "DOB", "Ngày sinh", "Ngay sinh"]),
  Sex: getCell(row, ["Sex", "Gender", "Giới tính", "Gioi tinh"]),
  idNumber: getCell(row, ["idNumber", "CCCD", "Số căn cước", "So can cuoc"]),
  Expire: getCell(row, ["Expire", "Hạn căn cước", "Han can cuoc"]),
  GuideID: getCell(row, ["GuideID", "Số thẻ HDV", "So the HDV", "Thẻ HDV"]),
  GuideExpire: getCell(row, ["GuideExpire", "Hạn thẻ HDV", "Han the HDV"]),
  sdt: getCell(row, ["sdt", "SDT", "SĐT", "Phone", "Số điện thoại"]),
  stk: getCell(row, ["stk", "STK", "Bank", "Số tài khoản"]),
});

const normalizeRestaurant = (
  row: Record<string, unknown>,
  index: number,
  fallbackId: string,
): Restaurant => ({
  id: getCell(row, ["id", "ID", "Mã", "Mã nhà hàng"]) || `${fallbackId}-${index + 1}`,
  city: getCell(row, ["city", "City", "Thành phố", "Tỉnh"]),
  name: getCell(row, ["name", "Tên", "Tên nhà hàng", "Restaurant Name"]),
  address: getCell(row, ["address", "Địa chỉ", "Address"]),
  phone: getCell(row, ["phone", "SDT", "SĐT", "Số điện thoại"]),
  email: getCell(row, ["email", "Email"]),
  contactPerson: getCell(row, ["contactPerson", "Người liên hệ", "Contact"]),
  note: getCell(row, ["note", "Ghi chú", "Note"]),
});

export function DatabaseFeature() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<DbTab>("guides");
  const [guides, setGuides] = useState<GuideData[]>(() =>
    localDatabase.getGuides(),
  );
  const [restaurants, setRestaurants] = useState<Restaurant[]>(() =>
    localDatabase.getRestaurants(),
  );
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [guidePage, setGuidePage] = useState(1);
  const [restaurantPage, setRestaurantPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [guideDraft, setGuideDraft] = useState<GuideData>(() => ({
    ...emptyGuide,
    Id: nextCode("HDV", localDatabase.getGuides().map((guide) => guide.Id)),
  }));
  const [restaurantDraft, setRestaurantDraft] = useState<Restaurant>(() => ({
    ...emptyRestaurant,
    id: nextCode(
      "NH",
      localDatabase.getRestaurants().map((restaurant) => restaurant.id),
    ),
  }));
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [extractingGuide, setExtractingGuide] = useState(false);

  const nextGuideId = () => nextCode("HDV", guides.map((guide) => guide.Id));
  const nextRestaurantId = () =>
    nextCode("NH", restaurants.map((restaurant) => restaurant.id));

  const currentCount = tab === "guides" ? guides.length : restaurants.length;

  const cities = useMemo(() => {
    const source =
      tab === "guides"
        ? guides.map((guide) => guide.City)
        : restaurants.map((restaurant) => restaurant.city);
    return Array.from(new Set(source.filter(Boolean))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [guides, restaurants, tab]);

  const filteredGuides = useMemo(() => {
    const needle = removeAccents(query.toLowerCase());
    return guides.filter((guide) => {
      const haystack = removeAccents(
        `${guide.Id} ${guide.Name} ${guide.City} ${guide.sdt} ${guide.GuideID}`.toLowerCase(),
      );
      return (
        (!query || haystack.includes(needle)) &&
        (!cityFilter || guide.City === cityFilter)
      );
    });
  }, [cityFilter, guides, query]);

  const filteredRestaurants = useMemo(() => {
    const needle = removeAccents(query.toLowerCase());
    return restaurants.filter((restaurant) => {
      const haystack = removeAccents(
        `${restaurant.id} ${restaurant.name} ${restaurant.city} ${restaurant.phone} ${restaurant.address}`.toLowerCase(),
      );
      return (
        (!query || haystack.includes(needle)) &&
        (!cityFilter || restaurant.city === cityFilter)
      );
    });
  }, [cityFilter, query, restaurants]);

  const guidePageCount = Math.max(
    1,
    Math.ceil(filteredGuides.length / PAGE_SIZE),
  );
  const restaurantPageCount = Math.max(
    1,
    Math.ceil(filteredRestaurants.length / PAGE_SIZE),
  );
  const safeGuidePage = Math.min(guidePage, guidePageCount);
  const safeRestaurantPage = Math.min(restaurantPage, restaurantPageCount);
  const pagedGuides = filteredGuides.slice(
    (safeGuidePage - 1) * PAGE_SIZE,
    safeGuidePage * PAGE_SIZE,
  );
  const pagedRestaurants = filteredRestaurants.slice(
    (safeRestaurantPage - 1) * PAGE_SIZE,
    safeRestaurantPage * PAGE_SIZE,
  );

  const showNotice = (type: "success" | "error", message: string) => {
    setNotice({ type, message });
    window.setTimeout(() => setNotice(null), 3500);
  };

  const commitGuides = (next: GuideData[]) => {
    setGuides(next);
    localDatabase.saveGuides(next);
  };

  const commitRestaurants = (next: Restaurant[]) => {
    setRestaurants(next);
    localDatabase.saveRestaurants(next);
  };

  const resetGuideDraft = (next = guides) => {
    setEditingId(null);
    setGuideDraft({ ...emptyGuide, Id: nextCode("HDV", next.map((g) => g.Id)) });
  };

  const resetRestaurantDraft = (next = restaurants) => {
    setEditingId(null);
    setRestaurantDraft({
      ...emptyRestaurant,
      id: nextCode("NH", next.map((restaurant) => restaurant.id)),
    });
  };

  const resetDraft = () => {
    resetGuideDraft();
    resetRestaurantDraft();
  };

  const importWorkbook = async (file: File) => {
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        workbook.Sheets[workbook.SheetNames[0]],
      );

      if (tab === "guides") {
        const imported = rows
          .map((row, index) => normalizeGuide(row, index, nextGuideId()))
          .filter((guide) => guide.Name);
        if (!imported.length) throw new Error("Không tìm thấy dòng HDV hợp lệ.");
        commitGuides(imported);
        resetGuideDraft(imported);
        showNotice("success", `Đã import ${imported.length} HDV.`);
        return;
      }

      const imported = rows
        .map((row, index) => normalizeRestaurant(row, index, nextRestaurantId()))
        .filter((restaurant) => restaurant.name);
      if (!imported.length) {
        throw new Error("Không tìm thấy dòng nhà hàng hợp lệ.");
      }
      commitRestaurants(imported);
      resetRestaurantDraft(imported);
      showNotice("success", `Đã import ${imported.length} nhà hàng.`);
    } catch (err: any) {
      showNotice("error", err.message || "Không đọc được file Excel/CSV.");
    }
  };

  const exportCurrentTable = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Contract Auto Filter";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(
      tab === "guides" ? "Database HDV" : "Database Nhà hàng",
      {
        views: [{ state: "frozen", ySplit: 1 }],
      },
    );

    if (tab === "guides") {
      worksheet.columns = [
        { header: "ID", key: "Id", width: 12 },
        { header: "Thành phố", key: "City", width: 16 },
        { header: "Họ và tên", key: "Name", width: 28 },
        { header: "Địa chỉ thường trú", key: "Address", width: 42 },
        { header: "Ngày sinh", key: "DoB", width: 14 },
        { header: "Giới tính", key: "Sex", width: 10 },
        { header: "CCCD", key: "idNumber", width: 18 },
        { header: "Hạn CCCD", key: "Expire", width: 14 },
        { header: "Số thẻ HDV", key: "GuideID", width: 18 },
        { header: "Hạn thẻ HDV", key: "GuideExpire", width: 14 },
        { header: "SĐT", key: "sdt", width: 16 },
        { header: "STK", key: "stk", width: 20 },
      ];

      guides.forEach((guide) => {
        worksheet.addRow({
          ...guide,
          DoB: formatDateForExport(guide.DoB),
          Expire: formatDateForExport(guide.Expire),
          GuideExpire: formatDateForExport(guide.GuideExpire),
        });
      });
    } else {
      worksheet.columns = [
        { header: "Mã", key: "id", width: 12 },
        { header: "Thành phố", key: "city", width: 16 },
        { header: "Tên nhà hàng", key: "name", width: 30 },
        { header: "Địa chỉ", key: "address", width: 42 },
        { header: "SĐT", key: "phone", width: 16 },
        { header: "Email", key: "email", width: 26 },
        { header: "Người liên hệ", key: "contactPerson", width: 22 },
        { header: "Ghi chú", key: "note", width: 34 },
      ];

      restaurants.forEach((restaurant) => worksheet.addRow(restaurant));
    }

    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: worksheet.columnCount },
    };

    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        cell.alignment = {
          vertical: "middle",
          wrapText: true,
        };

        if (rowNumber === 1) {
          cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF334155" },
          };
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
          };
        }
      });

      if (rowNumber > 1) {
        row.height = 28;
        if (rowNumber % 2 === 0) {
          row.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF8FAFC" },
            };
          });
        }
      }
    });

    worksheet.getRow(1).height = 30;

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      tab === "guides" ? "database-hdv.xlsx" : "database-nha-hang.xlsx",
    );
  };

  const saveGuide = () => {
    if (!guideDraft.Name.trim()) {
      showNotice("error", "Tên HDV là bắt buộc.");
      return;
    }

    const normalized = {
      ...guideDraft,
      Id: editingId || guideDraft.Id || nextGuideId(),
    };
    const next = editingId
      ? guides.map((guide) => (guide.Id === editingId ? normalized : guide))
      : [normalized, ...guides];

    commitGuides(next);
    resetGuideDraft(next);
    showNotice("success", "Đã lưu HDV.");
  };

  const saveRestaurant = () => {
    if (!restaurantDraft.name.trim()) {
      showNotice("error", "Tên nhà hàng là bắt buộc.");
      return;
    }

    const normalized = {
      ...restaurantDraft,
      id: editingId || restaurantDraft.id || nextRestaurantId(),
    };
    const next = editingId
      ? restaurants.map((restaurant) =>
          restaurant.id === editingId ? normalized : restaurant,
        )
      : [normalized, ...restaurants];

    commitRestaurants(next);
    resetRestaurantDraft(next);
    showNotice("success", "Đã lưu nhà hàng.");
  };

  const removeGuide = (id: string) => {
    const next = guides.filter((guide) => guide.Id !== id);
    commitGuides(next);
    resetGuideDraft(next);
    showNotice("success", "Đã xóa HDV.");
  };

  const removeRestaurant = (id: string) => {
    const next = restaurants.filter((restaurant) => restaurant.id !== id);
    commitRestaurants(next);
    resetRestaurantDraft(next);
    showNotice("success", "Đã xóa nhà hàng.");
  };

  const startEditGuide = (guide: GuideData) => {
    setTab("guides");
    setEditingId(guide.Id);
    setGuideDraft(guide);
  };

  const startEditRestaurant = (restaurant: Restaurant) => {
    setTab("restaurants");
    setEditingId(restaurant.id);
    setRestaurantDraft(restaurant);
  };

  const extractGuideFromImages = async (idCard: File, guideCard: File) => {
    if (!isGeminiConfigured()) {
      showNotice(
        "error",
        "Chưa cấu hình VITE_GEMINI_API_KEY trong file .env. Tạo .env từ .env.example rồi chạy lại npm run dev.",
      );
      return;
    }

    if (
      !supportedImageTypes.has(idCard.type) ||
      !supportedImageTypes.has(guideCard.type)
    ) {
      showNotice("error", "Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.");
      return;
    }

    setExtractingGuide(true);
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
                text: `Trích xuất thông tin từ ảnh CCCD và thẻ hướng dẫn viên du lịch. Trả JSON thuần với các trường: fullName, gender, idNumber, dob, address, han_can_cuoc, guideCardNumber, guideCardExpire. Địa chỉ phải là nơi thường trú trên CCCD, không lấy quê quán.`,
              },
              { inlineData: { mimeType: idCard.type, data: idCardBase64 } },
              {
                inlineData: {
                  mimeType: guideCard.type,
                  data: guideCardBase64,
                },
              },
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
      const extracted = JSON.parse(jsonText.trim()) as ExtractedGuide;
      setGuideDraft((current) => ({
        ...current,
        Name: extracted.fullName || current.Name,
        Sex: normalizeGender(extracted.gender) || current.Sex,
        idNumber: extracted.idNumber || current.idNumber,
        DoB: extracted.dob || current.DoB,
        Address: extracted.address || current.Address,
        Expire: extracted.han_can_cuoc || current.Expire,
        GuideID: extracted.guideCardNumber || current.GuideID,
        GuideExpire: extracted.guideCardExpire || current.GuideExpire,
      }));
      showNotice("success", "Đã trích xuất thông tin HDV từ ảnh.");
    } catch (err) {
      console.error("Guide extraction error:", err);
      showNotice("error", getGeminiErrorMessage(err));
    } finally {
      setExtractingGuide(false);
    }
  };

  return (
    <motion.div
      key="database-mode"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-[2rem] shadow-sm border border-black/5 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-slate-50/60">
          <div>
            <h2 className="text-2xl font-serif italic text-secondary">
              Database vận hành
            </h2>
            <p className="text-sm text-slate-500">
              Lưu HDV và nhà hàng để dùng lại cho hợp đồng, menu và điều tour.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm flex items-center gap-2"
            >
              <Upload size={17} /> Import Excel
            </button>
            <button
              onClick={exportCurrentTable}
              disabled={currentCount === 0}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm flex items-center gap-2 disabled:opacity-40"
            >
              <Download size={17} /> Export
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) importWorkbook(file);
                event.currentTarget.value = "";
              }}
            />
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-wrap gap-2">
            <TabButton
              active={tab === "guides"}
              icon={Users}
              label={`HDV (${guides.length})`}
              onClick={() => {
                setTab("guides");
                setQuery("");
                setCityFilter("");
                setGuidePage(1);
                resetDraft();
              }}
            />
            <TabButton
              active={tab === "restaurants"}
              icon={Building2}
              label={`Nhà hàng (${restaurants.length})`}
              onClick={() => {
                setTab("restaurants");
                setQuery("");
                setCityFilter("");
                setRestaurantPage(1);
                resetDraft();
              }}
            />
          </div>

          {notice && (
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold ${
                notice.type === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {notice.type === "success" ? (
                <CheckCircle2 size={17} />
              ) : (
                <AlertCircle size={17} />
              )}
              {notice.message}
            </div>
          )}

          <div className="grid grid-cols-1 2xl:grid-cols-[420px_minmax(0,1fr)] gap-6">
            <div className="bg-slate-50 rounded-3xl border border-slate-100 p-5 h-fit">
              {tab === "guides" ? (
                <GuideForm
                  draft={guideDraft}
                  editing={Boolean(editingId)}
                  extracting={extractingGuide}
                  onChange={setGuideDraft}
                  onCancel={() => resetGuideDraft()}
                  onExtract={extractGuideFromImages}
                  onSave={saveGuide}
                />
              ) : (
                <RestaurantForm
                  draft={restaurantDraft}
                  editing={Boolean(editingId)}
                  onChange={setRestaurantDraft}
                  onCancel={() => resetRestaurantDraft()}
                  onSave={saveRestaurant}
                />
              )}
            </div>

            <div className="space-y-4 min-w-0">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setGuidePage(1);
                      setRestaurantPage(1);
                    }}
                    placeholder={
                      tab === "guides"
                        ? "Tìm tên, ID, SĐT, thẻ HDV..."
                        : "Tìm tên, mã, SĐT, địa chỉ..."
                    }
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-primary/10"
                  />
                </div>
                <select
                  value={cityFilter}
                  onChange={(event) => {
                    setCityFilter(event.target.value);
                    setGuidePage(1);
                    setRestaurantPage(1);
                  }}
                  className="px-4 py-3 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-primary/10"
                >
                  <option value="">Tất cả thành phố</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              {tab === "guides" ? (
                <>
                  <GuideTable
                    guides={pagedGuides}
                    onEdit={startEditGuide}
                    onRemove={removeGuide}
                  />
                  <Pagination
                    page={safeGuidePage}
                    pageCount={guidePageCount}
                    total={filteredGuides.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setGuidePage}
                  />
                </>
              ) : (
                <>
                  <RestaurantTable
                    restaurants={pagedRestaurants}
                    onEdit={startEditRestaurant}
                    onRemove={removeRestaurant}
                  />
                  <Pagination
                    page={safeRestaurantPage}
                    pageCount={restaurantPageCount}
                    total={filteredRestaurants.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setRestaurantPage}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Users;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 ${
        active
          ? "bg-primary text-white shadow-lg shadow-primary/20"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      <Icon size={18} /> {label}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
  type = "text",
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  type?: "text" | "date" | "tel" | "email";
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-4 focus:ring-primary/10 ${
          readOnly ? "bg-slate-100 text-slate-500 font-mono" : "bg-white"
        }`}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <select
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-4 focus:ring-primary/10"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilePickBox({
  label,
  file,
  onFile,
}: {
  label: string;
  file: File | null;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="min-h-24 rounded-2xl border-2 border-dashed border-slate-200 bg-white hover:border-primary/50 hover:bg-primary/5 transition-all px-3 py-4 text-left"
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
      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
        <ImageIcon size={17} className="text-primary" /> {label}
      </div>
      <div className="mt-2 text-xs text-slate-500 truncate">
        {file ? file.name : "Chọn ảnh hoặc ảnh chụp từ điện thoại"}
      </div>
    </button>
  );
}

function GuideForm({
  draft,
  editing,
  extracting,
  onChange,
  onCancel,
  onExtract,
  onSave,
}: {
  draft: GuideData;
  editing: boolean;
  extracting: boolean;
  onChange: (guide: GuideData) => void;
  onCancel: () => void;
  onExtract: (idCard: File, guideCard: File) => void;
  onSave: () => void;
}) {
  const [idCard, setIdCard] = useState<File | null>(null);
  const [guideCard, setGuideCard] = useState<File | null>(null);
  const update = (patch: Partial<GuideData>) => onChange({ ...draft, ...patch });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-bold text-slate-800">
            {editing ? <Pencil size={18} /> : <Plus size={18} />}
            {editing ? "Sửa HDV" : "Thêm HDV"}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ID tự tăng, không cần nhập thủ công.
          </p>
        </div>
        <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-mono text-sm text-slate-600">
          {draft.Id}
        </span>
      </div>

      <div className="rounded-3xl border border-primary/10 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-bold text-sm text-slate-800">
              Trích xuất từ ảnh
            </div>
            <div className="text-xs text-slate-500">
              Upload CCCD và thẻ HDV để tự điền thông tin.
            </div>
          </div>
          <Sparkles size={18} className="text-primary" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FilePickBox label="Ảnh CCCD" file={idCard} onFile={setIdCard} />
          <FilePickBox label="Thẻ HDV" file={guideCard} onFile={setGuideCard} />
        </div>
        <button
          type="button"
          disabled={!idCard || !guideCard || extracting}
          onClick={() => idCard && guideCard && onExtract(idCard, guideCard)}
          className="w-full px-4 py-3 rounded-2xl bg-secondary text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {extracting ? (
            <>
              <Loader2 size={17} className="animate-spin" /> Đang trích xuất...
            </>
          ) : (
            <>
              <Sparkles size={17} /> Trích xuất vào form
            </>
          )}
        </button>
      </div>

      <Field label="ID" value={draft.Id} onChange={() => undefined} readOnly />
      <Field label="Tên HDV" value={draft.Name} onChange={(Name) => update({ Name })} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Thành phố" value={draft.City} onChange={(City) => update({ City })} />
        <SelectField
          label="Giới tính"
          value={draft.Sex}
          onChange={(Sex) => update({ Sex })}
          options={[
            { value: "", label: "Chọn giới tính" },
            { value: "M", label: "Nam" },
            { value: "F", label: "Nữ" },
          ]}
        />
      </div>
      <Field label="Địa chỉ thường trú" value={draft.Address} onChange={(Address) => update({ Address })} />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Ngày sinh"
          type="date"
          value={toDateInputValue(draft.DoB)}
          onChange={(DoB) => update({ DoB })}
        />
        <Field label="CCCD" value={draft.idNumber} onChange={(idNumber) => update({ idNumber })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Hạn CCCD"
          type="date"
          value={toDateInputValue(draft.Expire)}
          onChange={(Expire) => update({ Expire })}
        />
        <Field label="Thẻ HDV" value={draft.GuideID} onChange={(GuideID) => update({ GuideID })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Hạn thẻ"
          type="date"
          value={toDateInputValue(draft.GuideExpire)}
          onChange={(GuideExpire) => update({ GuideExpire })}
        />
        <Field label="SĐT" type="tel" value={draft.sdt} onChange={(sdt) => update({ sdt })} />
      </div>
      <Field label="STK" value={draft.stk} onChange={(stk) => update({ stk })} />
      <FormActions editing={editing} onCancel={onCancel} onSave={onSave} />
    </div>
  );
}

function RestaurantForm({
  draft,
  editing,
  onChange,
  onCancel,
  onSave,
}: {
  draft: Restaurant;
  editing: boolean;
  onChange: (restaurant: Restaurant) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const update = (patch: Partial<Restaurant>) => onChange({ ...draft, ...patch });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-bold text-slate-800">
            {editing ? <Pencil size={18} /> : <Plus size={18} />}
            {editing ? "Sửa nhà hàng" : "Thêm nhà hàng"}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Mã nhà hàng tự tăng để tránh nhập trùng.
          </p>
        </div>
        <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-mono text-sm text-slate-600">
          {draft.id}
        </span>
      </div>

      <Field label="Mã" value={draft.id} onChange={() => undefined} readOnly />
      <Field label="Tên nhà hàng" value={draft.name} onChange={(name) => update({ name })} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Thành phố" value={draft.city} onChange={(city) => update({ city })} />
        <Field label="SĐT" type="tel" value={draft.phone} onChange={(phone) => update({ phone })} />
      </div>
      <Field label="Địa chỉ" value={draft.address} onChange={(address) => update({ address })} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Người liên hệ" value={draft.contactPerson} onChange={(contactPerson) => update({ contactPerson })} />
        <Field label="Email" type="email" value={draft.email} onChange={(email) => update({ email })} />
      </div>
      <Field label="Ghi chú" value={draft.note} onChange={(note) => update({ note })} />
      <FormActions editing={editing} onCancel={onCancel} onSave={onSave} />
    </div>
  );
}

function FormActions({
  editing,
  onCancel,
  onSave,
}: {
  editing: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex gap-2 pt-2">
      <button
        onClick={onSave}
        className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2"
      >
        <Save size={17} /> Lưu
      </button>
      {editing && (
        <button
          onClick={onCancel}
          className="px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-sm"
        >
          Hủy
        </button>
      )}
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pages = getVisiblePages(page, pageCount);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
      <div className="text-sm text-slate-500">
        Hiển thị {start}-{end} / {total} dòng
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 disabled:opacity-40"
        >
          Trước
        </button>
        {pages.map((pageNumber, index) =>
          pageNumber === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="px-2 py-2 text-sm font-bold text-slate-400"
            >
              ...
            </span>
          ) : (
            <button
              key={pageNumber}
              onClick={() => onPageChange(pageNumber)}
              className={`min-w-10 px-3 py-2 rounded-xl text-sm font-bold ${
                pageNumber === page
                  ? "bg-primary text-white"
                  : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              {pageNumber}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page >= pageCount}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 disabled:opacity-40"
        >
          Sau
        </button>
      </div>
    </div>
  );
}

function getVisiblePages(
  currentPage: number,
  pageCount: number,
): Array<number | "ellipsis"> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, pageCount - 1, pageCount]);

  if (currentPage <= 4) {
    [2, 3, 4, 5].forEach((page) => pages.add(page));
  } else if (currentPage >= pageCount - 3) {
    [pageCount - 4, pageCount - 3, pageCount - 2].forEach((page) =>
      pages.add(page),
    );
  } else {
    [currentPage - 1, currentPage, currentPage + 1].forEach((page) =>
      pages.add(page),
    );
  }

  const sortedPages = Array.from(pages)
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);

  return sortedPages.flatMap((page, index) => {
    const previous = sortedPages[index - 1];
    if (previous && page - previous > 1) {
      return ["ellipsis" as const, page];
    }
    return [page];
  });
}

function GuideTable({
  guides,
  onEdit,
  onRemove,
}: {
  guides: GuideData[];
  onEdit: (guide: GuideData) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="w-full max-w-full overflow-x-auto border border-slate-100 rounded-3xl bg-white">
      <table className="w-full text-left min-w-[760px]">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3">ID</th>
            <th className="px-4 py-3">Tên</th>
            <th className="px-4 py-3">Thành phố</th>
            <th className="px-4 py-3">SĐT</th>
            <th className="px-4 py-3">CCCD / Hạn</th>
            <th className="px-4 py-3">Thẻ HDV / Hạn</th>
            <th className="px-4 py-3">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {guides.map((guide) => {
            const expired =
              isExpired(guide.Expire) || isExpired(guide.GuideExpire);
            return (
              <tr key={guide.Id} className={expired ? "bg-red-50/70" : ""}>
                <td className="px-4 py-3 text-sm font-mono text-slate-500">
                  {guide.Id}
                </td>
                <td className="px-4 py-3 text-sm font-bold min-w-40">
                  {guide.Name}
                </td>
                <td className="px-4 py-3 text-sm">{guide.City}</td>
                <td className="px-4 py-3 text-sm">{guide.sdt}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="font-mono">{guide.idNumber}</div>
                  <div
                    className={
                      isExpired(guide.Expire)
                        ? "text-xs text-red-600 font-bold"
                        : "text-xs text-slate-400"
                    }
                  >
                    {guide.Expire}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="font-mono">{guide.GuideID}</div>
                  <div
                    className={
                      isExpired(guide.GuideExpire)
                        ? "text-xs text-red-600 font-bold"
                        : "text-xs text-slate-400"
                    }
                  >
                    {guide.GuideExpire}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    onEdit={() => onEdit(guide)}
                    onRemove={() => onRemove(guide.Id)}
                  />
                </td>
              </tr>
            );
          })}
          {guides.length === 0 && <EmptyRow colSpan={7} />}
        </tbody>
      </table>
    </div>
  );
}

function RestaurantTable({
  restaurants,
  onEdit,
  onRemove,
}: {
  restaurants: Restaurant[];
  onEdit: (restaurant: Restaurant) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="w-full max-w-full overflow-x-auto border border-slate-100 rounded-3xl bg-white">
      <table className="w-full text-left min-w-[720px]">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3">Mã</th>
            <th className="px-4 py-3">Tên nhà hàng</th>
            <th className="px-4 py-3">Thành phố</th>
            <th className="px-4 py-3">Liên hệ</th>
            <th className="px-4 py-3">Địa chỉ</th>
            <th className="px-4 py-3">Ghi chú</th>
            <th className="px-4 py-3">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {restaurants.map((restaurant) => (
            <tr key={restaurant.id}>
              <td className="px-4 py-3 text-sm font-mono text-slate-500">
                {restaurant.id}
              </td>
              <td className="px-4 py-3 text-sm font-bold">{restaurant.name}</td>
              <td className="px-4 py-3 text-sm">{restaurant.city}</td>
              <td className="px-4 py-3 text-sm">
                <div>{restaurant.contactPerson}</div>
                <div className="text-slate-500">{restaurant.phone}</div>
                <div className="text-slate-400">{restaurant.email}</div>
              </td>
              <td className="px-4 py-3 text-sm max-w-[220px]">
                {restaurant.address}
              </td>
              <td className="px-4 py-3 text-sm max-w-[180px]">
                {restaurant.note}
              </td>
              <td className="px-4 py-3">
                <RowActions
                  onEdit={() => onEdit(restaurant)}
                  onRemove={() => onRemove(restaurant.id)}
                />
              </td>
            </tr>
          ))}
          {restaurants.length === 0 && <EmptyRow colSpan={7} />}
        </tbody>
      </table>
    </div>
  );
}

function RowActions({
  onEdit,
  onRemove,
}: {
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onEdit}
        className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
        title="Sửa"
      >
        <Pencil size={16} />
      </button>
      <button
        onClick={onRemove}
        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
        title="Xóa"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-16 text-center text-slate-500">
        Chưa có dữ liệu hoặc không tìm thấy kết quả phù hợp.
      </td>
    </tr>
  );
}
