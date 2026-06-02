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
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Utensils,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { GuideEditorModal } from "../../shared/components";
import { CITY_OPTIONS } from "../../shared/constants/cities";
import { ai, appDatabase, isGeminiConfigured, localDatabase } from "../../shared/services";
import type {
  GuideData,
  Restaurant,
  RestaurantMenu,
} from "../../shared/types/domain";
import { isExpired, removeAccents } from "../../shared/utils";

type DbTab = "guides" | "restaurants" | "menus";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

type PendingImport = {
  tab: DbTab;
  guides?: GuideData[];
  restaurants?: Restaurant[];
  menus?: RestaurantMenu[];
};

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

const emptyMenu: RestaurantMenu = {
  restaurantId: "",
  menuName: "",
  detail: "",
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

const compareRecordId = (left: string, right: string) => {
  const leftMatch = left.match(/^([^\d]*)(\d+)$/);
  const rightMatch = right.match(/^([^\d]*)(\d+)$/);

  if (leftMatch && rightMatch && leftMatch[1] === rightMatch[1]) {
    return Number(leftMatch[2]) - Number(rightMatch[2]);
  }

  return left.localeCompare(right, undefined, { numeric: true });
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

const getDatabaseErrorMessage = (err: unknown) => {
  if (!err) return "Không rõ lỗi.";
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (typeof err === "object") {
    const record = err as Record<string, unknown>;
    return [
      record.message ? `Message: ${String(record.message)}` : "",
      record.code ? `Code: ${String(record.code)}` : "",
      record.details ? `Details: ${String(record.details)}` : "",
      record.hint ? `Hint: ${String(record.hint)}` : "",
    ]
      .filter(Boolean)
      .join("\n") || JSON.stringify(record, null, 2);
  }
  return String(err);
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

const normalizeMenu = (row: Record<string, unknown>): RestaurantMenu => ({
  restaurantId: getCell(row, ["ID nhà hàng", "Restaurant ID", "Mã nhà hàng"]),
  menuName: getCell(row, ["Menu name", "Tên menu", "Menu"]),
  detail: getCell(row, ["Detail", "Chi tiết", "Nội dung"]),
  note: getCell(row, ["NOTE", "Ghi chú", "Lưu ý"]),
});

const getMenuKey = (menu: RestaurantMenu) =>
  `${menu.restaurantId}::${menu.menuName}`;

export function DatabaseFeature() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<DbTab>(() => {
    const requested = window.localStorage.getItem("hello-maya.database-tab");
    window.localStorage.removeItem("hello-maya.database-tab");
    return requested === "restaurants" || requested === "menus" || requested === "guides"
      ? requested
      : "guides";
  });
  const [guides, setGuides] = useState<GuideData[]>(() =>
    localDatabase.getGuides(),
  );
  const [restaurants, setRestaurants] = useState<Restaurant[]>(() =>
    localDatabase.getRestaurants(),
  );
  const [menus, setMenus] = useState<RestaurantMenu[]>(() =>
    localDatabase.getRestaurantMenus(),
  );
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [guidePage, setGuidePage] = useState(1);
  const [restaurantPage, setRestaurantPage] = useState(1);
  const [menuPage, setMenuPage] = useState(1);
  const [selectedGuideIds, setSelectedGuideIds] = useState<string[]>([]);
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<string[]>([]);
  const [selectedMenuKeys, setSelectedMenuKeys] = useState<string[]>([]);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [databaseError, setDatabaseError] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [bulkDeleteRequest, setBulkDeleteRequest] = useState<{
    tab: DbTab;
    ids: string[];
  } | null>(null);
  const [singleDeleteRequest, setSingleDeleteRequest] = useState<{
    tab: DbTab;
    id: string;
    label: string;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<RestaurantMenu | null>(null);
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
  const [menuDraft, setMenuDraft] = useState<RestaurantMenu>(emptyMenu);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [extractingGuide, setExtractingGuide] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    syncDatabase({ showAlert: false, showSuccess: false });
  }, []);

  useEffect(() => {
    if (!isEditorOpen && !selectedMenu) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isEditorOpen, selectedMenu]);

  const nextGuideId = () => nextCode("HDV", guides.map((guide) => guide.Id));
  const nextRestaurantId = () =>
    nextCode("NH", restaurants.map((restaurant) => restaurant.id));

  const currentCount =
    tab === "guides"
      ? guides.length
      : tab === "restaurants"
        ? restaurants.length
        : menus.length;

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
    return guides
      .filter((guide) => {
        const haystack = removeAccents(
          `${guide.Id} ${guide.Name} ${guide.City} ${guide.sdt} ${guide.GuideID}`.toLowerCase(),
        );
        return (
          (!query || haystack.includes(needle)) &&
          (!cityFilter || guide.City === cityFilter)
        );
      })
      .sort((left, right) => compareRecordId(left.Id, right.Id));
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

  const filteredMenus = useMemo(() => {
    const needle = removeAccents(query.toLowerCase());
    return menus.filter((menu) => {
      const restaurant = restaurants.find((item) => item.id === menu.restaurantId);
      const haystack = removeAccents(
        `${menu.restaurantId} ${restaurant?.name || ""} ${restaurant?.city || ""} ${menu.menuName} ${menu.detail} ${menu.note}`.toLowerCase(),
      );
      return (
        (!query || haystack.includes(needle)) &&
        (!cityFilter || restaurant?.city === cityFilter)
      );
    });
  }, [cityFilter, menus, query, restaurants]);

  const guidePageCount = Math.max(
    1,
    Math.ceil(filteredGuides.length / pageSize),
  );
  const restaurantPageCount = Math.max(
    1,
    Math.ceil(filteredRestaurants.length / pageSize),
  );
  const menuPageCount = Math.max(1, Math.ceil(filteredMenus.length / pageSize));
  const safeGuidePage = Math.min(guidePage, guidePageCount);
  const safeRestaurantPage = Math.min(restaurantPage, restaurantPageCount);
  const safeMenuPage = Math.min(menuPage, menuPageCount);
  const pagedGuides = filteredGuides.slice(
    (safeGuidePage - 1) * pageSize,
    safeGuidePage * pageSize,
  );
  const pagedRestaurants = filteredRestaurants.slice(
    (safeRestaurantPage - 1) * pageSize,
    safeRestaurantPage * pageSize,
  );
  const pagedMenus = filteredMenus.slice(
    (safeMenuPage - 1) * pageSize,
    safeMenuPage * pageSize,
  );

  const updatePageSize = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    setGuidePage(1);
    setRestaurantPage(1);
    setMenuPage(1);
  };

  const showNotice = (type: "success" | "error", message: string) => {
    setNotice({ type, message });
    window.setTimeout(() => setNotice(null), 3500);
  };

  const syncDatabase = async ({
    showAlert = true,
    showSuccess = true,
  }: {
    showAlert?: boolean;
    showSuccess?: boolean;
  } = {}) => {
    setIsSyncing(true);
    try {
      const [nextGuides, nextRestaurants, nextMenus] = await Promise.all([
        appDatabase.getGuides(),
        appDatabase.getRestaurants(),
        appDatabase.getRestaurantMenus(),
      ]);
      setGuides(nextGuides);
      setRestaurants(nextRestaurants);
      setMenus(nextMenus);
      setSelectedGuideIds([]);
      setSelectedRestaurantIds([]);
      setSelectedMenuKeys([]);
      resetGuideDraft(nextGuides);
      resetRestaurantDraft(nextRestaurants);
      resetMenuDraft();
      if (showSuccess) showNotice("success", "Đã sync dữ liệu mới nhất.");
    } catch (err) {
      console.error("Failed to sync app database:", err);
      const message =
        err instanceof Error
          ? err.message
          : "Không tải được dữ liệu từ database.";
      showNotice("error", "Không tải được dữ liệu từ database.");
      if (showAlert) {
        setSyncError(message);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const commitGuides = (next: GuideData[], throwOnError = false) => {
    setGuides(next);
    return appDatabase.saveGuides(next).catch((err) => {
      console.error("Failed to save guides:", err);
      showNotice("error", "Không lưu được HDV vào database.");
      if (throwOnError) throw err;
    });
  };

  const currentSelectedIds =
    tab === "guides"
      ? selectedGuideIds
      : tab === "restaurants"
        ? selectedRestaurantIds
        : selectedMenuKeys;

  const clearCurrentSelection = () => {
    if (tab === "guides") setSelectedGuideIds([]);
    else if (tab === "restaurants") setSelectedRestaurantIds([]);
    else setSelectedMenuKeys([]);
  };

  const commitRestaurants = (next: Restaurant[], throwOnError = false) => {
    setRestaurants(next);
    return appDatabase.saveRestaurants(next).catch((err) => {
      console.error("Failed to save restaurants:", err);
      showNotice("error", "Không lưu được nhà hàng vào database.");
      if (throwOnError) throw err;
    });
  };

  const commitMenus = (next: RestaurantMenu[], throwOnError = false) => {
    setMenus(next);
    return appDatabase.saveRestaurantMenus(next).catch((err) => {
      console.error("Failed to save restaurant menus:", err);
      setDatabaseError({
        title: "Không lưu được menu vào database",
        message: getDatabaseErrorMessage(err),
      });
      showNotice("error", "Không lưu được menu vào database.");
      if (throwOnError) throw err;
    });
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

  const resetMenuDraft = () => {
    setEditingId(null);
    setMenuDraft(emptyMenu);
  };

  const resetDraft = () => {
    resetGuideDraft();
    resetRestaurantDraft();
    resetMenuDraft();
  };

  const openCreateModal = () => {
    resetDraft();
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    resetDraft();
  };

  const stageImport = (nextImport: PendingImport) => {
    setPendingImport(nextImport);
  };

  const applyPendingImport = async (mode: "replace" | "merge") => {
    if (!pendingImport) return;

    try {
      if (pendingImport.tab === "guides" && pendingImport.guides) {
        const next =
          mode === "replace"
            ? pendingImport.guides
            : [
                ...pendingImport.guides,
                ...guides.filter(
                  (guide) =>
                    !pendingImport.guides?.some(
                      (imported) => imported.Id === guide.Id,
                    ),
                ),
              ];
        await commitGuides(next, true);
        resetGuideDraft(next);
        setSelectedGuideIds([]);
        showNotice(
          "success",
          mode === "replace"
            ? `Đã thay thế database bằng ${pendingImport.guides.length} HDV.`
            : `Đã gộp/cập nhật ${pendingImport.guides.length} HDV.`,
        );
      }

      if (pendingImport.tab === "restaurants" && pendingImport.restaurants) {
        const nextRestaurants =
          mode === "replace"
            ? pendingImport.restaurants
            : [
                ...pendingImport.restaurants,
                ...restaurants.filter(
                  (restaurant) =>
                    !pendingImport.restaurants?.some(
                      (imported) => imported.id === restaurant.id,
                    ),
                ),
              ];
        await commitRestaurants(nextRestaurants, true);
        resetRestaurantDraft(nextRestaurants);
        setSelectedRestaurantIds([]);

        if (pendingImport.menus) {
          const nextMenus =
            mode === "replace"
              ? pendingImport.menus
              : [
                  ...pendingImport.menus,
                  ...menus.filter(
                    (menu) =>
                      !pendingImport.menus?.some(
                        (imported) => getMenuKey(imported) === getMenuKey(menu),
                      ),
                  ),
                ];
          await commitMenus(nextMenus, true);
          setSelectedMenuKeys([]);
        }

        showNotice(
          "success",
          pendingImport.menus
            ? mode === "replace"
              ? `Đã thay thế ${pendingImport.restaurants.length} nhà hàng và ${pendingImport.menus.length} menu.`
              : `Đã gộp/cập nhật ${pendingImport.restaurants.length} nhà hàng và ${pendingImport.menus.length} menu.`
            : mode === "replace"
              ? `Đã thay thế database bằng ${pendingImport.restaurants.length} nhà hàng.`
              : `Đã gộp/cập nhật ${pendingImport.restaurants.length} nhà hàng.`,
        );
      }

      if (pendingImport.tab === "menus" && pendingImport.menus) {
        const next =
          mode === "replace"
            ? pendingImport.menus
            : [
                ...pendingImport.menus,
                ...menus.filter(
                  (menu) =>
                    !pendingImport.menus?.some(
                      (imported) => getMenuKey(imported) === getMenuKey(menu),
                    ),
                ),
              ];
        await commitMenus(next, true);
        resetMenuDraft();
        setSelectedMenuKeys([]);
        showNotice(
          "success",
          mode === "replace"
            ? `Đã thay thế database bằng ${pendingImport.menus.length} menu.`
            : `Đã gộp/cập nhật ${pendingImport.menus.length} menu.`,
        );
      }

      setPendingImport(null);
    } catch (err) {
      console.error("Import failed:", err);
    }
  };

  const importWorkbook = async (file: File) => {
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheetRows = () =>
        XLSX.utils.sheet_to_json<Record<string, unknown>>(
          workbook.Sheets[workbook.SheetNames[0]],
        );

      if (tab === "guides") {
        const imported = firstSheetRows()
          .map((row, index) => normalizeGuide(row, index, nextGuideId()))
          .filter((guide) => guide.Name);
        if (!imported.length) throw new Error("Không tìm thấy dòng HDV hợp lệ.");
        stageImport({ tab, guides: imported });
        return;
      }

      const ttnhSheetName = workbook.SheetNames.find(
        (name) => name.toUpperCase() === "TTNH",
      );
      const menuSheetName = workbook.SheetNames.find(
        (name) => name.toUpperCase() === "MENU",
      );

      if (tab === "menus") {
        const rows = menuSheetName
          ? XLSX.utils.sheet_to_json<Record<string, unknown>>(
              workbook.Sheets[menuSheetName],
            )
          : firstSheetRows();
        const importedMenus = rows
          .map(normalizeMenu)
          .filter((menu) => menu.restaurantId && menu.menuName);
        if (!importedMenus.length) {
          throw new Error("Không tìm thấy dòng menu hợp lệ.");
        }
        stageImport({ tab, menus: importedMenus });
        return;
      }

      const restaurantRows = ttnhSheetName
        ? XLSX.utils.sheet_to_json<Record<string, unknown>>(
            workbook.Sheets[ttnhSheetName],
          )
        : firstSheetRows();
      const imported = restaurantRows
        .map((row, index) => normalizeRestaurant(row, index, nextRestaurantId()))
        .filter((restaurant) => restaurant.name);
      if (!imported.length) {
        throw new Error("Không tìm thấy dòng nhà hàng hợp lệ.");
      }

      if (menuSheetName) {
        const importedMenus = XLSX.utils
          .sheet_to_json<Record<string, unknown>>(workbook.Sheets[menuSheetName])
          .map(normalizeMenu)
          .filter((menu) => menu.restaurantId && menu.menuName);
        stageImport({ tab, restaurants: imported, menus: importedMenus });
        return;
      }

      stageImport({ tab, restaurants: imported });
    } catch (err: any) {
      showNotice("error", err.message || "Không đọc được file Excel/CSV.");
    }
  };

  const exportCurrentTable = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Contract Auto Filter";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(
      tab === "guides"
        ? "Database HDV"
        : tab === "restaurants"
          ? "TTNH"
          : "MENU",
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
    } else if (tab === "restaurants") {
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
    } else {
      worksheet.columns = [
        { header: "ID nhà hàng", key: "restaurantId", width: 16 },
        { header: "Menu name", key: "menuName", width: 28 },
        { header: "Detail", key: "detail", width: 56 },
        { header: "NOTE", key: "note", width: 34 },
      ];

      menus.forEach((menu) => worksheet.addRow(menu));
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
      tab === "guides"
        ? "database-hdv.xlsx"
        : tab === "restaurants"
          ? "database-nha-hang.xlsx"
          : "database-menu.xlsx",
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
    setIsEditorOpen(false);
    showNotice("success", "Đã lưu HDV.");
  };

  const saveGuideFromModal = (guide: GuideData) => {
    const normalized = {
      ...guide,
      Id: editingId || guide.Id || nextGuideId(),
    };
    const next = editingId
      ? guides.map((item) => (item.Id === editingId ? normalized : item))
      : [normalized, ...guides];

    commitGuides(next);
    resetGuideDraft(next);
    setIsEditorOpen(false);
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
    setIsEditorOpen(false);
    showNotice("success", "Đã lưu nhà hàng.");
  };

  const saveMenu = () => {
    if (!menuDraft.restaurantId || !menuDraft.menuName.trim()) {
      showNotice("error", "Nhà hàng và tên menu là bắt buộc.");
      return;
    }

    const normalized = {
      ...menuDraft,
      menuName: menuDraft.menuName.trim(),
    };
    const nextKey = getMenuKey(normalized);
    const duplicate = menus.some(
      (menu) => getMenuKey(menu) === nextKey && getMenuKey(menu) !== editingId,
    );
    if (duplicate) {
      showNotice("error", "Menu này đã tồn tại cho nhà hàng đã chọn.");
      return;
    }

    const next = editingId
      ? menus.map((menu) => (getMenuKey(menu) === editingId ? normalized : menu))
      : [normalized, ...menus];

    commitMenus(next);
    resetMenuDraft();
    setIsEditorOpen(false);
    showNotice("success", "Đã lưu menu.");
  };

  const removeGuide = (id: string) => {
    const next = guides.filter((guide) => guide.Id !== id);
    commitGuides(next);
    setSelectedGuideIds((ids) => ids.filter((item) => item !== id));
    resetGuideDraft(next);
    showNotice("success", "Đã xóa HDV.");
  };

  const removeRestaurant = (id: string) => {
    const next = restaurants.filter((restaurant) => restaurant.id !== id);
    commitRestaurants(next);
    commitMenus(menus.filter((menu) => menu.restaurantId !== id));
    setSelectedRestaurantIds((ids) => ids.filter((item) => item !== id));
    setSelectedMenuKeys((keys) =>
      keys.filter((key) => !key.startsWith(`${id}::`)),
    );
    resetRestaurantDraft(next);
    showNotice("success", "Đã xóa nhà hàng.");
  };

  const removeMenu = (key: string) => {
    const next = menus.filter((menu) => getMenuKey(menu) !== key);
    commitMenus(next);
    setSelectedMenuKeys((keys) => keys.filter((item) => item !== key));
    resetMenuDraft();
    showNotice("success", "Đã xóa menu.");
  };

  const requestRemoveGuide = (guide: GuideData) => {
    setSingleDeleteRequest({
      tab: "guides",
      id: guide.Id,
      label: guide.Name || guide.Id,
    });
  };

  const requestRemoveRestaurant = (restaurant: Restaurant) => {
    setSingleDeleteRequest({
      tab: "restaurants",
      id: restaurant.id,
      label: restaurant.name || restaurant.id,
    });
  };

  const requestRemoveMenu = (menu: RestaurantMenu) => {
    setSingleDeleteRequest({
      tab: "menus",
      id: getMenuKey(menu),
      label: menu.menuName || getMenuKey(menu),
    });
  };

  const confirmSingleDelete = () => {
    if (!singleDeleteRequest) return;
    if (singleDeleteRequest.tab === "guides") {
      removeGuide(singleDeleteRequest.id);
    } else if (singleDeleteRequest.tab === "restaurants") {
      removeRestaurant(singleDeleteRequest.id);
    } else {
      removeMenu(singleDeleteRequest.id);
    }
    setSingleDeleteRequest(null);
  };

  const removeSelectedRows = () => {
    const activeSelectedIds =
      tab === "guides"
        ? selectedGuideIds
        : tab === "restaurants"
          ? selectedRestaurantIds
          : selectedMenuKeys;

    if (activeSelectedIds.length === 0) {
      showNotice("error", "Vui lòng chọn ít nhất một dòng để xóa.");
      return;
    }

    setBulkDeleteRequest({ tab, ids: activeSelectedIds });
  };

  const confirmBulkDelete = () => {
    if (!bulkDeleteRequest) return;

    if (bulkDeleteRequest.tab === "guides") {
      const ids = new Set(bulkDeleteRequest.ids);
      const next = guides.filter((guide) => !ids.has(guide.Id));
      commitGuides(next);
      setSelectedGuideIds([]);
      resetGuideDraft(next);
      showNotice("success", `Đã xóa ${ids.size} HDV.`);
      setBulkDeleteRequest(null);
      return;
    }

    if (bulkDeleteRequest.tab === "restaurants") {
      const ids = new Set(bulkDeleteRequest.ids);
      const nextRestaurants = restaurants.filter(
        (restaurant) => !ids.has(restaurant.id),
      );
      const nextMenus = menus.filter((menu) => !ids.has(menu.restaurantId));
      commitRestaurants(nextRestaurants);
      commitMenus(nextMenus);
      setSelectedRestaurantIds([]);
      setSelectedMenuKeys((keys) =>
        keys.filter((key) => !bulkDeleteRequest.ids.some((id) => key.startsWith(`${id}::`))),
      );
      resetRestaurantDraft(nextRestaurants);
      showNotice("success", `Đã xóa ${ids.size} nhà hàng.`);
      setBulkDeleteRequest(null);
      return;
    }

    const keys = new Set(bulkDeleteRequest.ids);
    const next = menus.filter((menu) => !keys.has(getMenuKey(menu)));
    commitMenus(next);
    setSelectedMenuKeys([]);
    resetMenuDraft();
    showNotice("success", `Đã xóa ${keys.size} menu.`);
    setBulkDeleteRequest(null);
  };

  const startEditGuide = (guide: GuideData) => {
    setTab("guides");
    setEditingId(guide.Id);
    setGuideDraft(guide);
    setIsEditorOpen(true);
  };

  const startEditRestaurant = (restaurant: Restaurant) => {
    setTab("restaurants");
    setEditingId(restaurant.id);
    setRestaurantDraft(restaurant);
    setIsEditorOpen(true);
  };

  const startEditMenu = (menu: RestaurantMenu) => {
    setTab("menus");
    setEditingId(getMenuKey(menu));
    setMenuDraft(menu);
    setIsEditorOpen(true);
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Danh sách dữ liệu</h2>
            <p className="text-sm text-slate-500 mt-1">
              Quản lý HDV và nhà hàng dùng lại trong các nghiệp vụ.
            </p>
          </div>
	          <div className="flex flex-wrap gap-2">
	            <button
	              type="button"
	              onClick={() => syncDatabase()}
	              disabled={isSyncing}
	              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm flex items-center gap-2 disabled:opacity-40"
	            >
	              <RefreshCw
	                size={17}
	                className={isSyncing ? "animate-spin" : ""}
	              />
	              {isSyncing ? "Đang sync..." : "Sync"}
	            </button>
	            <button
	              type="button"
	              onClick={openCreateModal}
	              className="px-4 py-2.5 rounded-xl bg-slate-950 text-white font-bold text-sm flex items-center gap-2"
            >
              <Plus size={17} /> Thêm mới
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm flex items-center gap-2"
            >
              <Upload size={17} /> Import Excel
            </button>
            <button
              type="button"
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

        <div className="p-5 space-y-5 bg-slate-50/60">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
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
            <TabButton
              active={tab === "menus"}
              icon={Utensils}
              label={`Menu (${menus.length})`}
              onClick={() => {
                setTab("menus");
                setQuery("");
                setCityFilter("");
                setMenuPage(1);
                resetDraft();
              }}
            />
            </div>

            <div className="flex flex-col md:flex-row gap-3 xl:min-w-[520px]">
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
                    setMenuPage(1);
                  }}
                  placeholder={
                    tab === "guides"
                      ? "Tìm tên, ID, SĐT, thẻ HDV..."
                      : tab === "restaurants"
                        ? "Tìm tên, mã, SĐT, địa chỉ..."
                        : "Tìm nhà hàng, tên menu, nội dung..."
                  }
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-primary/10"
                />
              </div>
              <select
                value={cityFilter}
                onChange={(event) => {
                  setCityFilter(event.target.value);
                  setGuidePage(1);
                  setRestaurantPage(1);
                  setMenuPage(1);
                }}
                className="px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-primary/10"
              >
                <option value="">Tất cả thành phố</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
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

          <div className="space-y-4 min-w-0">
              {currentSelectedIds.length > 0 && (
                <div className="flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-red-700 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-bold">
                    Đã chọn {currentSelectedIds.length} dòng
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={clearCurrentSelection}
                      className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Bỏ chọn
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        removeSelectedRows();
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
                    >
                      <Trash2 size={16} />
                      Xóa đã chọn
                    </button>
                  </div>
                </div>
              )}
              {tab === "guides" ? (
                <>
                  <GuideTable
                    guides={pagedGuides}
                    selectedIds={selectedGuideIds}
                    onToggleSelected={(id) =>
                      setSelectedGuideIds((ids) =>
                        ids.includes(id)
                          ? ids.filter((item) => item !== id)
                          : [...ids, id],
                      )
                    }
                    onTogglePage={() => {
                      const pageIds = pagedGuides.map((guide) => guide.Id);
                      const hasAll = pageIds.every((id) =>
                        selectedGuideIds.includes(id),
                      );
                      setSelectedGuideIds((ids) =>
                        hasAll
                          ? ids.filter((id) => !pageIds.includes(id))
                          : Array.from(new Set([...ids, ...pageIds])),
                      );
                    }}
                    onEdit={startEditGuide}
                    onRemove={requestRemoveGuide}
                  />
                  <Pagination
                    page={safeGuidePage}
                    pageCount={guidePageCount}
                    total={filteredGuides.length}
                    pageSize={pageSize}
                    onPageSizeChange={updatePageSize}
                    onPageChange={setGuidePage}
                  />
                </>
              ) : tab === "restaurants" ? (
                <>
                  <RestaurantTable
                    restaurants={pagedRestaurants}
                    selectedIds={selectedRestaurantIds}
                    onToggleSelected={(id) =>
                      setSelectedRestaurantIds((ids) =>
                        ids.includes(id)
                          ? ids.filter((item) => item !== id)
                          : [...ids, id],
                      )
                    }
                    onTogglePage={() => {
                      const pageIds = pagedRestaurants.map(
                        (restaurant) => restaurant.id,
                      );
                      const hasAll = pageIds.every((id) =>
                        selectedRestaurantIds.includes(id),
                      );
                      setSelectedRestaurantIds((ids) =>
                        hasAll
                          ? ids.filter((id) => !pageIds.includes(id))
                          : Array.from(new Set([...ids, ...pageIds])),
                      );
                    }}
                    onEdit={startEditRestaurant}
                    onRemove={requestRemoveRestaurant}
                  />
                  <Pagination
                    page={safeRestaurantPage}
                    pageCount={restaurantPageCount}
                    total={filteredRestaurants.length}
                    pageSize={pageSize}
                    onPageSizeChange={updatePageSize}
                    onPageChange={setRestaurantPage}
                  />
                </>
              ) : (
                <>
                  <MenuTable
                    menus={pagedMenus}
                    restaurants={restaurants}
                    selectedKeys={selectedMenuKeys}
                    onToggleSelected={(key) =>
                      setSelectedMenuKeys((keys) =>
                        keys.includes(key)
                          ? keys.filter((item) => item !== key)
                          : [...keys, key],
                      )
                    }
                    onTogglePage={() => {
                      const pageKeys = pagedMenus.map(getMenuKey);
                      const hasAll = pageKeys.every((key) =>
                        selectedMenuKeys.includes(key),
                      );
                      setSelectedMenuKeys((keys) =>
                        hasAll
                          ? keys.filter((key) => !pageKeys.includes(key))
                          : Array.from(new Set([...keys, ...pageKeys])),
                      );
                    }}
                    onView={setSelectedMenu}
                    onEdit={startEditMenu}
                    onRemove={requestRemoveMenu}
                  />
                  <Pagination
                    page={safeMenuPage}
                    pageCount={menuPageCount}
                    total={filteredMenus.length}
                    pageSize={pageSize}
                    onPageSizeChange={updatePageSize}
                    onPageChange={setMenuPage}
                  />
                </>
              )}
          </div>
        </div>
      </div>

      {isEditorOpen && tab !== "guides" && (
        <EditorModal
          title={
            tab === "restaurants"
                ? editingId
                  ? "Sửa nhà hàng"
                  : "Thêm nhà hàng"
                : editingId
                  ? "Sửa menu"
                  : "Thêm menu"
          }
          onClose={closeEditor}
        >
          {tab === "restaurants" ? (
            <RestaurantForm
              draft={restaurantDraft}
              editing={Boolean(editingId)}
              onChange={setRestaurantDraft}
              onCancel={closeEditor}
              onSave={saveRestaurant}
            />
          ) : (
            <MenuForm
              draft={menuDraft}
              editing={Boolean(editingId)}
              restaurants={restaurants}
              onChange={setMenuDraft}
              onCancel={closeEditor}
              onSave={saveMenu}
            />
          )}
        </EditorModal>
      )}

      {isEditorOpen && tab === "guides" && (
        <GuideEditorModal
          title={editingId ? "Sửa HDV" : "Thêm HDV"}
          initialGuide={guideDraft}
          existingGuides={guides}
          saveLabel="Lưu"
          onClose={closeEditor}
          onSave={saveGuideFromModal}
        />
      )}

      {selectedMenu && (
        <MenuDetailModal
          menu={selectedMenu}
          restaurant={restaurants.find(
            (restaurant) => restaurant.id === selectedMenu.restaurantId,
          )}
          onClose={() => setSelectedMenu(null)}
          onEdit={() => {
            setSelectedMenu(null);
            startEditMenu(selectedMenu);
          }}
        />
      )}

      {pendingImport && (
        <ImportConfirmModal
          pendingImport={pendingImport}
          onClose={() => setPendingImport(null)}
          onReplace={() => applyPendingImport("replace")}
          onMerge={() => applyPendingImport("merge")}
        />
      )}

      {syncError && (
        <SyncErrorDialog
          message={syncError}
          onClose={() => setSyncError(null)}
          onRetry={() => {
            setSyncError(null);
            syncDatabase();
          }}
        />
      )}

      {databaseError && (
        <DatabaseErrorDialog
          title={databaseError.title}
          message={databaseError.message}
          onClose={() => setDatabaseError(null)}
        />
      )}

      {bulkDeleteRequest && (
        <BulkDeleteDialog
          count={bulkDeleteRequest.ids.length}
          label={
            bulkDeleteRequest.tab === "guides"
              ? "HDV"
              : bulkDeleteRequest.tab === "restaurants"
                ? "nhà hàng"
                : "menu"
          }
          onClose={() => setBulkDeleteRequest(null)}
          onConfirm={confirmBulkDelete}
        />
      )}

      {singleDeleteRequest && (
        <SingleDeleteDialog
          label={singleDeleteRequest.label}
          typeLabel={
            singleDeleteRequest.tab === "guides"
              ? "HDV"
              : singleDeleteRequest.tab === "restaurants"
                ? "nhà hàng"
                : "menu"
          }
          onClose={() => setSingleDeleteRequest(null)}
          onConfirm={confirmSingleDelete}
        />
      )}
    </motion.div>
  );
}

function SingleDeleteDialog({
  label,
  typeLabel,
  onClose,
  onConfirm,
}: {
  label: string;
  typeLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg rounded-3xl bg-white shadow-2xl shadow-slate-950/20"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Trash2 size={22} />
            </div>
            <div>
              <h3 className="text-xl font-serif italic text-secondary">
                Xóa {typeLabel}?
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Bạn đang chuẩn bị xóa <span className="font-bold text-slate-700">{label}</span>. Hành động này không thể hoàn tác.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700">
            Dữ liệu sẽ bị xóa khỏi danh sách hiện tại và được đồng bộ lại vào database.
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700"
          >
            <Trash2 size={16} />
            Xóa
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function BulkDeleteDialog({
  count,
  label,
  onClose,
  onConfirm,
}: {
  count: number;
  label: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg rounded-3xl bg-white shadow-2xl shadow-slate-950/20"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Trash2 size={22} />
            </div>
            <div>
              <h3 className="text-xl font-serif italic text-secondary">
                Xóa dữ liệu đã chọn?
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Bạn đang chuẩn bị xóa {count} {label}. Hành động này không thể hoàn tác.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700">
            Dữ liệu sẽ bị xóa khỏi danh sách hiện tại và được đồng bộ lại vào database.
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700"
          >
            <Trash2 size={16} />
            Xóa đã chọn
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function DatabaseErrorDialog({
  title,
  message,
  onClose,
}: {
  title: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl shadow-slate-950/20"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertCircle size={22} />
            </div>
            <div>
              <h3 className="text-xl font-serif italic text-secondary">
                {title}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Chi tiết lỗi trả về từ database.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700">
            {message}
          </pre>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
          >
            Đóng
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function SyncErrorDialog({
  message,
  onClose,
  onRetry,
}: {
  message: string;
  onClose: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg rounded-3xl bg-white shadow-2xl shadow-slate-950/20"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertCircle size={22} />
            </div>
            <div>
              <h3 className="text-xl font-serif italic text-secondary">
                Không sync được database
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Vui lòng kiểm tra kết nối mạng hoặc cấu hình Supabase.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700">
            {message}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary/90"
          >
            <RefreshCw size={16} />
            Thử lại
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ImportConfirmModal({
  pendingImport,
  onClose,
  onReplace,
  onMerge,
}: {
  pendingImport: PendingImport;
  onClose: () => void;
  onReplace: () => void;
  onMerge: () => void;
}) {
  const importedCount =
    (pendingImport.guides?.length || 0) +
    (pendingImport.restaurants?.length || 0) +
    (pendingImport.menus?.length || 0);
  const detailParts = [
    pendingImport.guides?.length ? `${pendingImport.guides.length} HDV` : "",
    pendingImport.restaurants?.length
      ? `${pendingImport.restaurants.length} nhà hàng`
      : "",
    pendingImport.menus?.length ? `${pendingImport.menus.length} menu` : "",
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-xl rounded-3xl bg-white shadow-2xl shadow-slate-950/20"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-xl font-serif italic text-secondary">
              Xác nhận import dữ liệu
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              File import có {detailParts.join(", ") || `${importedCount} dòng`}.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <div className="font-bold text-red-700">Thay thế toàn bộ</div>
            <p className="mt-1 text-sm leading-6 text-red-700/80">
              Xóa dữ liệu hiện tại của nhóm đang import rồi ghi dữ liệu từ file.
              Chọn mục này khi file Excel là nguồn dữ liệu đầy đủ mới nhất.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="font-bold text-emerald-700">
              Gộp/cập nhật theo ID
            </div>
            <p className="mt-1 text-sm leading-6 text-emerald-700/80">
              Dòng trùng ID sẽ được cập nhật, dòng mới sẽ được thêm vào, dữ liệu
              hiện có không nằm trong file vẫn được giữ lại.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600"
          >
            Hủy
          </button>
          <button
            onClick={onReplace}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700"
          >
            Thay thế toàn bộ
          </button>
          <button
            onClick={onMerge}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary/90"
          >
            Gộp/cập nhật theo ID
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function EditorModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="flex max-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl shadow-slate-950/20"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-slate-950">{title}</h3>
            <p className="text-sm text-slate-500">
              Nhập thông tin rồi lưu để cập nhật database.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </motion.div>
    </div>
  );
}

function MenuDetailModal({
  menu,
  restaurant,
  onClose,
  onEdit,
}: {
  menu: RestaurantMenu;
  restaurant?: Restaurant;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="flex max-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl shadow-slate-950/20"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950">{menu.menuName}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {restaurant?.name || "Không tìm thấy nhà hàng"}
              {restaurant?.city ? ` · ${restaurant.city}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Nội dung menu
            </div>
            <div className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
              {menu.detail || "Chưa có nội dung menu."}
            </div>
          </div>
          {menu.note && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Ghi chú
              </div>
              <div className="mt-2 text-sm text-slate-700">{menu.note}</div>
            </div>
          )}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
          >
            Sửa menu
          </button>
        </div>
      </motion.div>
    </div>
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

function CityField({
  label = "Thành phố",
  value,
  onChange,
}: {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
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
        <CityField value={draft.City} onChange={(City) => update({ City })} />
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
        <CityField value={draft.city} onChange={(city) => update({ city })} />
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

function MenuForm({
  draft,
  editing,
  restaurants,
  onChange,
  onCancel,
  onSave,
}: {
  draft: RestaurantMenu;
  editing: boolean;
  restaurants: Restaurant[];
  onChange: (menu: RestaurantMenu) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const update = (patch: Partial<RestaurantMenu>) => onChange({ ...draft, ...patch });
  const [restaurantCityFilter, setRestaurantCityFilter] = useState("");
  const [detailInputMode, setDetailInputMode] = useState<"manual" | "image">("manual");
  const [menuImage, setMenuImage] = useState<File | null>(null);
  const [isExtractingMenu, setIsExtractingMenu] = useState(false);
  const [extractMenuError, setExtractMenuError] = useState<string | null>(null);
  const menuImageInputRef = useRef<HTMLInputElement>(null);
  const selectedRestaurant = restaurants.find(
    (restaurant) => restaurant.id === draft.restaurantId,
  );
  const restaurantCities = Array.from(
    new Set(restaurants.map((restaurant) => restaurant.city).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
  const filteredRestaurants = restaurantCityFilter
    ? restaurants.filter((restaurant) => restaurant.city === restaurantCityFilter)
    : restaurants;

  const extractMenuFromImage = async () => {
    if (!menuImage) {
      setExtractMenuError("Vui lòng chọn ảnh menu.");
      return;
    }
    if (!supportedImageTypes.has(menuImage.type)) {
      setExtractMenuError("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.");
      return;
    }

    setIsExtractingMenu(true);
    setExtractMenuError(null);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                text: `Trích xuất nội dung menu từ ảnh. Trả JSON thuần với các trường:
- menuName: tên menu nếu thấy rõ, nếu không có thì để trống
- detail: danh sách món ăn, mỗi món một dòng, giữ nguyên ngôn ngữ trong ảnh, không tự thêm món
- note: ghi chú/allergy/điều kiện nếu có, nếu không có thì để trống`,
              },
              {
                inlineData: {
                  mimeType: menuImage.type,
                  data: await fileToBase64(menuImage),
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
              menuName: { type: Type.STRING },
              detail: { type: Type.STRING },
              note: { type: Type.STRING },
            },
          },
        },
      });

      const extracted = JSON.parse(response.text || "{}") as {
        menuName?: string;
        detail?: string;
        note?: string;
      };
      update({
        menuName: draft.menuName || extracted.menuName || "",
        detail: extracted.detail || draft.detail,
        note: draft.note || extracted.note || "",
      });
    } catch (err) {
      console.error("Menu image extraction error:", err);
      setExtractMenuError(getGeminiErrorMessage(err));
    } finally {
      setIsExtractingMenu(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-bold text-slate-800">
            {editing ? <Pencil size={18} /> : <Plus size={18} />}
            {editing ? "Sửa menu" : "Thêm menu"}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Menu được gắn với một nhà hàng để dùng khi lập lịch thực đơn.
          </p>
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Lọc thành phố
        </span>
        <select
          value={restaurantCityFilter}
          onChange={(event) => {
            const nextCity = event.target.value;
            setRestaurantCityFilter(nextCity);
            if (
              nextCity &&
              selectedRestaurant &&
              selectedRestaurant.city !== nextCity
            ) {
              update({ restaurantId: "" });
            }
          }}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-4 focus:ring-primary/10"
        >
          <option value="">Tất cả thành phố</option>
          {restaurantCities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Tên nhà hàng
        </span>
        <select
          value={draft.restaurantId}
          onChange={(event) => update({ restaurantId: event.target.value })}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-4 focus:ring-primary/10"
        >
          <option value="">Chọn nhà hàng</option>
          {filteredRestaurants.map((restaurant) => (
            <option key={restaurant.id} value={restaurant.id}>
              {restaurant.name}
            </option>
          ))}
        </select>
      </label>
      <Field
        label="Tên menu"
        value={draft.menuName}
        onChange={(menuName) => update({ menuName })}
      />
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDetailInputMode("manual")}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${
              detailInputMode === "manual"
                ? "bg-primary text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            Nhập thủ công
          </button>
          <button
            type="button"
            onClick={() => setDetailInputMode("image")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${
              detailInputMode === "image"
                ? "bg-primary text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ImageIcon size={16} />
            Trích xuất từ ảnh
          </button>
        </div>

        {detailInputMode === "image" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => menuImageInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const picked = event.dataTransfer.files?.[0];
                if (picked) {
                  setMenuImage(picked);
                  setExtractMenuError(null);
                }
              }}
              className="w-full rounded-2xl border-2 border-dashed border-slate-200 bg-white px-4 py-5 text-left transition-all hover:border-primary/50 hover:bg-primary/5"
            >
              <input
                ref={menuImageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const picked = event.target.files?.[0];
                  if (picked) {
                    setMenuImage(picked);
                    setExtractMenuError(null);
                  }
                  event.currentTarget.value = "";
                }}
              />
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <ImageIcon size={17} className="text-primary" />
                {menuImage ? menuImage.name : "Chọn hoặc kéo thả ảnh menu"}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Hỗ trợ JPG, PNG, WebP. Kết quả sẽ tự điền vào ô Nội dung menu.
              </div>
            </button>

            {extractMenuError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                <AlertCircle size={16} />
                {extractMenuError}
              </div>
            )}

            <button
              type="button"
              disabled={!menuImage || isExtractingMenu}
              onClick={extractMenuFromImage}
              className="w-full rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isExtractingMenu ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Đang trích xuất...
                </>
              ) : (
                <>
                  <Sparkles size={17} />
                  Trích xuất nội dung menu
                </>
              )}
            </button>
          </div>
        )}
      </div>
      <label className="block space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Nội dung menu
        </span>
        <textarea
          value={draft.detail}
          onChange={(event) => update({ detail: event.target.value })}
          rows={8}
          placeholder="Mỗi món một dòng để khi xuất Word dễ đọc."
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-4 focus:ring-primary/10"
        />
      </label>
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
  onPageSizeChange,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  onPageChange: (page: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pages = getVisiblePages(page, pageCount);

  return (
    <div className="flex flex-col gap-3 px-1 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center">
        <div>
          Hiển thị {start}-{end} / {total} dòng
        </div>
        <label className="inline-flex items-center gap-2">
          <span>Số dòng/trang</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 outline-none focus:ring-4 focus:ring-primary/10"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
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
  selectedIds,
  onToggleSelected,
  onTogglePage,
  onEdit,
  onRemove,
}: {
  guides: GuideData[];
  selectedIds: string[];
  onToggleSelected: (id: string) => void;
  onTogglePage: () => void;
  onEdit: (guide: GuideData) => void;
  onRemove: (guide: GuideData) => void;
}) {
  const allPageSelected =
    guides.length > 0 && guides.every((guide) => selectedIds.includes(guide.Id));

  return (
    <div className="w-full max-w-full overflow-x-auto border border-slate-100 rounded-3xl bg-white">
      <table className="w-full text-left min-w-[800px]">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3 w-12">
              <input
                type="checkbox"
                checked={allPageSelected}
                disabled={guides.length === 0}
                onChange={onTogglePage}
                className="h-4 w-4 rounded border-slate-300 text-primary"
                aria-label="Chọn tất cả HDV trên trang"
              />
            </th>
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
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(guide.Id)}
                    onChange={() => onToggleSelected(guide.Id)}
                    className="h-4 w-4 rounded border-slate-300 text-primary"
                    aria-label={`Chọn ${guide.Name}`}
                  />
                </td>
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
                    onRemove={() => onRemove(guide)}
                  />
                </td>
              </tr>
            );
          })}
          {guides.length === 0 && <EmptyRow colSpan={8} />}
        </tbody>
      </table>
    </div>
  );
}

function RestaurantTable({
  restaurants,
  selectedIds,
  onToggleSelected,
  onTogglePage,
  onEdit,
  onRemove,
}: {
  restaurants: Restaurant[];
  selectedIds: string[];
  onToggleSelected: (id: string) => void;
  onTogglePage: () => void;
  onEdit: (restaurant: Restaurant) => void;
  onRemove: (restaurant: Restaurant) => void;
}) {
  const allPageSelected =
    restaurants.length > 0 &&
    restaurants.every((restaurant) => selectedIds.includes(restaurant.id));

  return (
    <div className="w-full max-w-full overflow-x-auto border border-slate-100 rounded-3xl bg-white">
      <table className="w-full text-left min-w-[760px]">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3 w-12">
              <input
                type="checkbox"
                checked={allPageSelected}
                disabled={restaurants.length === 0}
                onChange={onTogglePage}
                className="h-4 w-4 rounded border-slate-300 text-primary"
                aria-label="Chọn tất cả nhà hàng trên trang"
              />
            </th>
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
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(restaurant.id)}
                  onChange={() => onToggleSelected(restaurant.id)}
                  className="h-4 w-4 rounded border-slate-300 text-primary"
                  aria-label={`Chọn ${restaurant.name}`}
                />
              </td>
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
                  onRemove={() => onRemove(restaurant)}
                />
              </td>
            </tr>
          ))}
          {restaurants.length === 0 && <EmptyRow colSpan={8} />}
        </tbody>
      </table>
    </div>
  );
}

function MenuTable({
  menus,
  restaurants,
  selectedKeys,
  onToggleSelected,
  onTogglePage,
  onView,
  onEdit,
  onRemove,
}: {
  menus: RestaurantMenu[];
  restaurants: Restaurant[];
  selectedKeys: string[];
  onToggleSelected: (key: string) => void;
  onTogglePage: () => void;
  onView: (menu: RestaurantMenu) => void;
  onEdit: (menu: RestaurantMenu) => void;
  onRemove: (menu: RestaurantMenu) => void;
}) {
  const restaurantById = new Map(
    restaurants.map((restaurant) => [restaurant.id, restaurant]),
  );
  const allPageSelected =
    menus.length > 0 &&
    menus.every((menu) => selectedKeys.includes(getMenuKey(menu)));

  return (
    <div className="w-full max-w-full overflow-x-auto border border-slate-100 rounded-3xl bg-white">
      <table className="w-full text-left min-w-[800px]">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3 w-12">
              <input
                type="checkbox"
                checked={allPageSelected}
                disabled={menus.length === 0}
                onChange={onTogglePage}
                className="h-4 w-4 rounded border-slate-300 text-primary"
                aria-label="Chọn tất cả menu trên trang"
              />
            </th>
            <th className="px-4 py-3">Nhà hàng</th>
            <th className="px-4 py-3">Menu</th>
            <th className="px-4 py-3">Nội dung</th>
            <th className="px-4 py-3">Ghi chú</th>
            <th className="px-4 py-3">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {menus.map((menu) => {
            const restaurant = restaurantById.get(menu.restaurantId);
            const key = getMenuKey(menu);
            return (
              <tr
                key={key}
                tabIndex={0}
                onClick={() => onView(menu)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onView(menu);
                  }
                }}
                className="cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedKeys.includes(key)}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() => onToggleSelected(key)}
                    className="h-4 w-4 rounded border-slate-300 text-primary"
                    aria-label={`Chọn ${menu.menuName}`}
                  />
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="font-bold text-slate-800">
                    {restaurant?.name || "Không tìm thấy nhà hàng"}
                  </div>
                  <div className="font-mono text-xs text-slate-400">
                    {menu.restaurantId}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-bold min-w-44">
                  {menu.menuName}
                </td>
                <td className="px-4 py-3 text-sm max-w-[360px]">
                  <div className="line-clamp-3 whitespace-pre-line text-slate-600">
                    {menu.detail}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm max-w-[220px]">
                  {menu.note}
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    onEdit={() => onEdit(menu)}
                    onRemove={() => onRemove(menu)}
                  />
                </td>
              </tr>
            );
          })}
          {menus.length === 0 && <EmptyRow colSpan={6} />}
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
        onClick={(event) => {
          event.stopPropagation();
          onEdit();
        }}
        className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
        title="Sửa"
      >
        <Pencil size={16} />
      </button>
      <button
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
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
