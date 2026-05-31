import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Database,
  Download,
  FileText,
  Loader2,
  Plus,
  Search,
  Upload,
  Utensils,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import type { MenuPlanDay, Restaurant, RestaurantMenu } from "../../shared/types/domain";
import { localDatabase } from "../../shared/services";
import { removeAccents } from "../../shared/utils";

const getVal = (row: any, aliases: string[]) => {
  for (const alias of aliases) {
    const key = Object.keys(row).find((candidate) => candidate.toLowerCase().trim() === alias.toLowerCase());
    if (key) return row[key];
  }
  return "";
};

export function MenuPlannerFeature() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuFile, setMenuFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>(() =>
    localDatabase.getRestaurants(),
  );
  const [menus, setMenus] = useState<RestaurantMenu[]>([]);
  const [menuSearch, setMenuSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [menuPlan, setMenuPlan] = useState<MenuPlanDay[]>([]);
  const [error, setError] = useState<string | null>(null);

  const processMenu = async (fileToProcess: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      const workbook = XLSX.read(await fileToProcess.arrayBuffer(), { type: "array" });
      const ttnhSheetName = workbook.SheetNames.find((name) => name.toUpperCase() === "TTNH");
      const menuSheetName = workbook.SheetNames.find((name) => name.toUpperCase() === "MENU");
      if (!ttnhSheetName || !menuSheetName) {
        throw new Error("File Excel phải có 2 sheet tên là 'TTNH' và 'MENU'.");
      }

      const ttnhData = XLSX.utils.sheet_to_json(workbook.Sheets[ttnhSheetName]) as any[];
      const menuData = XLSX.utils.sheet_to_json(workbook.Sheets[menuSheetName]) as any[];

      const parsedRestaurants: Restaurant[] = ttnhData
        .map((row) => ({
          id: String(getVal(row, ["ID", "Mã", "Mã nhà hàng"]) || "").trim(),
          city: String(getVal(row, ["Thành phố", "City", "Tỉnh"]) || "").trim(),
          name: String(getVal(row, ["Tên nhà hàng", "Restaurant Name", "Tên"]) || "").trim(),
          address: String(getVal(row, ["Địa chỉ", "Address"]) || "").trim(),
          phone: String(getVal(row, ["SDT", "SĐT", "Phone", "Số điện thoại"]) || "").trim(),
          email: String(getVal(row, ["Email"]) || "").trim(),
        }))
        .filter((restaurant) => restaurant.id && restaurant.name);

      const parsedMenus: RestaurantMenu[] = menuData
        .map((row) => ({
          restaurantId: String(getVal(row, ["ID nhà hàng", "Restaurant ID", "Mã nhà hàng"]) || "").trim(),
          menuName: String(getVal(row, ["Menu name", "Tên menu", "Menu"]) || "").trim(),
          detail: String(getVal(row, ["Detail", "Chi tiết", "Nội dung"]) || "").trim(),
          note: String(getVal(row, ["NOTE", "Ghi chú", "Lưu ý"]) || "").trim(),
        }))
        .filter((menu) => menu.restaurantId && menu.menuName);

      if (parsedRestaurants.length === 0) throw new Error("Không tìm thấy dữ liệu nhà hàng hợp lệ trong sheet TTNH.");

      setRestaurants(parsedRestaurants);
      localDatabase.saveRestaurants(parsedRestaurants);
      setMenus(parsedMenus);
    } catch (err: any) {
      console.error("Menu processing error:", err);
      setError(err.message || "Có lỗi xảy ra khi xử lý file menu.");
    } finally {
      setIsProcessing(false);
    }
  };

  const acceptFile = (file?: File) => {
    if (!file) return;
    setMenuFile(file);
    processMenu(file);
  };

  const generateMenuPlan = () => {
    if (!startDate || !endDate) return;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days: MenuPlanDay[] = [];
    const curr = new Date(start);
    while (curr <= end) {
      days.push({ date: curr.toISOString().split("T")[0], option: "both" });
      curr.setDate(curr.getDate() + 1);
    }
    setMenuPlan(days);
  };

  const updateMenuPlanDay = (index: number, updates: Partial<MenuPlanDay>) => {
    setMenuPlan((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const isMenuPlanComplete =
    menuPlan.length > 0 &&
    menuPlan.every((day) => {
      if (day.option === "na") return true;
      if (day.option === "lunch") return day.lunchRestaurantId && day.lunchMenuName;
      if (day.option === "dinner") return day.dinnerRestaurantId && day.dinnerMenuName;
      return day.lunchRestaurantId && day.lunchMenuName && day.dinnerRestaurantId && day.dinnerMenuName;
    });

  const exportMenuPlan = async () => {
    if (!isMenuPlanComplete) return;

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

      const getMealContent = (restaurantId?: string, menuName?: string) => {
        if (!restaurantId || !menuName) return [new Paragraph({ text: "N/A" })];
        const restaurant = restaurants.find((item) => item.id === restaurantId);
        const menu = menus.find((item) => item.restaurantId === restaurantId && item.menuName === menuName);
        const content: any[] = [];

        if (restaurant) {
          content.push(new Paragraph({ children: [new TextRun({ text: restaurant.name, bold: true })] }));
          if (restaurant.address) content.push(new Paragraph({ children: [new TextRun({ text: `Add: ${restaurant.address}`, size: 18 })] }));
          if (restaurant.phone) content.push(new Paragraph({ children: [new TextRun({ text: `Tel: ${restaurant.phone}`, size: 18 })] }));
          if (restaurant.email) content.push(new Paragraph({ children: [new TextRun({ text: `Email: ${restaurant.email}`, size: 18 })] }));
        }

        if (menu) {
          content.push(new Paragraph({ children: [new TextRun({ text: `Menu: ${menu.menuName}`, bold: true, size: 20 })], spacing: { before: 120, after: 60 } }));
          menu.detail
            .split("\n")
            .filter((line) => line.trim())
            .forEach((line) => content.push(new Paragraph({ children: [new TextRun({ text: line.trim(), size: 18 })] })));
          if (menu.note) content.push(new Paragraph({ children: [new TextRun({ text: `Note: ${menu.note}`, italics: true, size: 16 })], spacing: { before: 120 } }));
        }

        return content;
      };

      const tableRows = [
        new TableRow({
          children: ["Date", "Lunch", "Dinner"].map(
            (header) =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })], alignment: AlignmentType.CENTER })],
                verticalAlign: VerticalAlign.CENTER,
              }),
          ),
        }),
        ...menuPlan.map((day, idx) => {
          const dateStr = new Date(day.date).toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "2-digit",
          });
          return new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun({ text: `Day ${idx + 1}`, bold: true })], alignment: AlignmentType.CENTER }),
                  new Paragraph({ children: [new TextRun({ text: dateStr })], alignment: AlignmentType.CENTER }),
                ],
                verticalAlign: VerticalAlign.CENTER,
              }),
              new TableCell({
                children: day.option === "lunch" || day.option === "both" ? getMealContent(day.lunchRestaurantId, day.lunchMenuName) : [new Paragraph({ text: "N/A" })],
              }),
              new TableCell({
                children: day.option === "dinner" || day.option === "both" ? getMealContent(day.dinnerRestaurantId, day.dinnerMenuName) : [new Paragraph({ text: "N/A" })],
              }),
            ],
          });
        }),
      ];

      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                children: [new TextRun({ text: "KẾ HOẠCH MENU TOUR", bold: true, size: 32 })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
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

      saveAs(await Packer.toBlob(doc), `Menu_Tour_${startDate}_to_${endDate}.docx`);
    } catch (err) {
      console.error("Export error:", err);
      setError("Có lỗi xảy ra khi xuất file Word.");
    }
  };

  const cities = Array.from(new Set(restaurants.map((restaurant) => restaurant.city))).filter(Boolean).sort();
  const filteredRestaurants = restaurants.filter((restaurant) => {
    const search = removeAccents(menuSearch.toLowerCase());
    const name = removeAccents(restaurant.name.toLowerCase());
    return (!menuSearch || name.includes(search)) && (!cityFilter || restaurant.city === cityFilter);
  });

  return (
    <motion.div
      key="menu-mode"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-secondary/5 border border-black/5">
        <div
          className={`bg-white p-12 rounded-[2rem] border-2 border-dashed transition-all flex flex-col items-center text-center group cursor-pointer h-64 justify-center ${
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
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".xlsx,.xls"
            onChange={(event) => {
              acceptFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {isProcessing ? (
            <>
              <Loader2 size={40} className="animate-spin text-primary mb-4" />
              <p className="font-bold text-secondary">Đang xử lý menu...</p>
            </>
          ) : menuFile ? (
            <>
              <CheckCircle2 size={40} className="text-green-600 mb-4" />
              <p className="font-medium text-gray-900 truncate max-w-[300px]">{menuFile.name}</p>
            </>
          ) : (
            <>
              <Upload size={40} className="text-primary mb-4" />
              <h3 className="font-bold text-secondary mb-1">Kéo thả file Excel menu</h3>
              <p className="text-xs text-gray-500">File cần có sheet TTNH và MENU</p>
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

        {restaurants.length > 0 && (
          <div className="mt-10 space-y-10">
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-6">
                <Calendar className="text-primary" size={28} /> Tạo lịch menu
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4">
                <input className="px-4 py-3 rounded-xl border border-gray-200" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                <input className="px-4 py-3 rounded-xl border border-gray-200" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                <button
                  onClick={generateMenuPlan}
                  disabled={!startDate || !endDate}
                  className="bg-secondary text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Plus size={18} /> Tạo lịch
                </button>
              </div>
            </div>

            {menuPlan.length > 0 && (
              <div className="space-y-4">
                {menuPlan.map((day, idx) => (
                  <div key={day.date} className="p-5 rounded-2xl border border-gray-100 bg-gray-50">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="md:w-44 font-bold text-secondary">
                        Day {idx + 1}
                        <div className="text-sm font-normal text-gray-500">{new Date(day.date).toLocaleDateString("vi-VN")}</div>
                      </div>
                      <select className="px-3 py-2 rounded-lg border" value={day.option} onChange={(event) => updateMenuPlanDay(idx, { option: event.target.value as MenuPlanDay["option"] })}>
                        <option value="both">Cả hai</option>
                        <option value="lunch">Chỉ trưa</option>
                        <option value="dinner">Chỉ tối</option>
                        <option value="na">N/A</option>
                      </select>
                      <MealSelectors
                        label="Trưa"
                        enabled={day.option === "lunch" || day.option === "both"}
                        cities={cities}
                        restaurants={restaurants}
                        menus={menus}
                        city={day.lunchCity}
                        restaurantId={day.lunchRestaurantId}
                        menuName={day.lunchMenuName}
                        onChange={(updates) => updateMenuPlanDay(idx, { lunchCity: updates.city, lunchRestaurantId: updates.restaurantId, lunchMenuName: updates.menuName })}
                      />
                      <MealSelectors
                        label="Tối"
                        enabled={day.option === "dinner" || day.option === "both"}
                        cities={cities}
                        restaurants={restaurants}
                        menus={menus}
                        city={day.dinnerCity}
                        restaurantId={day.dinnerRestaurantId}
                        menuName={day.dinnerMenuName}
                        onChange={(updates) => updateMenuPlanDay(idx, { dinnerCity: updates.city, dinnerRestaurantId: updates.restaurantId, dinnerMenuName: updates.menuName })}
                      />
                    </div>
                  </div>
                ))}
                <div className="flex justify-center pt-4">
                  <button
                    onClick={exportMenuPlan}
                    disabled={!isMenuPlanComplete}
                    className="bg-primary text-white px-12 py-4 rounded-full font-bold text-lg flex items-center gap-3 disabled:opacity-50"
                  >
                    <Download size={22} /> Xuất Menu (.docx)
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Database className="text-primary" size={28} /> Cơ sở dữ liệu Nhà hàng
              </h2>
              <div className="flex flex-col md:flex-row gap-4 bg-gray-50 p-6 rounded-2xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    value={menuSearch}
                    onChange={(event) => setMenuSearch(event.target.value)}
                    placeholder="Tìm nhà hàng..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200"
                  />
                </div>
                <select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} className="px-4 py-3 rounded-xl border border-gray-200">
                  <option value="">Tất cả thành phố</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRestaurants.map((restaurant) => (
                  <div key={restaurant.id} className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <h3 className="font-bold text-secondary flex items-center gap-2">
                      <Utensils size={18} /> {restaurant.name}
                    </h3>
                    <p className="text-sm text-gray-500">{restaurant.city}</p>
                    <p className="text-sm text-gray-500">{restaurant.address}</p>
                    <div className="mt-3 text-sm text-gray-700">
                      {menus.filter((menu) => menu.restaurantId === restaurant.id).length} menu
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MealSelectors({
  label,
  enabled,
  cities,
  restaurants,
  menus,
  city,
  restaurantId,
  menuName,
  onChange,
}: {
  label: string;
  enabled: boolean;
  cities: string[];
  restaurants: Restaurant[];
  menus: RestaurantMenu[];
  city?: string;
  restaurantId?: string;
  menuName?: string;
  onChange: (updates: { city?: string; restaurantId?: string; menuName?: string }) => void;
}) {
  if (!enabled) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-1">
      <select className="px-3 py-2 rounded-lg border" value={city || ""} onChange={(event) => onChange({ city: event.target.value, restaurantId: "", menuName: "" })}>
        <option value="">{label}: thành phố</option>
        {cities.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <select className="px-3 py-2 rounded-lg border" disabled={!city} value={restaurantId || ""} onChange={(event) => onChange({ city, restaurantId: event.target.value, menuName: "" })}>
        <option value="">Nhà hàng</option>
        {restaurants
          .filter((restaurant) => restaurant.city === city)
          .map((restaurant) => (
            <option key={restaurant.id} value={restaurant.id}>
              {restaurant.name}
            </option>
          ))}
      </select>
      <select className="px-3 py-2 rounded-lg border" disabled={!restaurantId} value={menuName || ""} onChange={(event) => onChange({ city, restaurantId, menuName: event.target.value })}>
        <option value="">Menu</option>
        {menus
          .filter((menu) => menu.restaurantId === restaurantId)
          .map((menu, idx) => (
            <option key={`${menu.menuName}-${idx}`} value={menu.menuName}>
              {menu.menuName}
            </option>
          ))}
      </select>
    </div>
  );
}
