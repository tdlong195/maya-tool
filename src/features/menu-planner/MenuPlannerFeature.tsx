import {
  AlertCircle,
  Calendar,
  Database,
  Download,
  Plus,
  Search,
  Utensils,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { saveAs } from "file-saver";
import type { MenuPlanDay, Restaurant, RestaurantMenu } from "../../shared/types/domain";
import { appDatabase, localDatabase } from "../../shared/services";
import { removeAccents } from "../../shared/utils";

export function MenuPlannerFeature() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(() =>
    localDatabase.getRestaurants(),
  );
  const [menus, setMenus] = useState<RestaurantMenu[]>(() =>
    localDatabase.getRestaurantMenus(),
  );
  const [menuSearch, setMenuSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [menuPlan, setMenuPlan] = useState<MenuPlanDay[]>([]);
  const [menuPreviewRestaurantId, setMenuPreviewRestaurantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([appDatabase.getRestaurants(), appDatabase.getRestaurantMenus()])
      .then(([nextRestaurants, nextMenus]) => {
        setRestaurants(nextRestaurants);
        setMenus(nextMenus);
      })
      .catch((err) => {
        console.error("Failed to load menu database:", err);
        setError("Không tải được dữ liệu nhà hàng/menu từ database.");
      });
  }, []);

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
  const previewRestaurant = restaurants.find(
    (restaurant) => restaurant.id === menuPreviewRestaurantId,
  );
  const previewMenus = menus.filter(
    (menu) => menu.restaurantId === menuPreviewRestaurantId,
  );

  useEffect(() => {
    if (!menuPreviewRestaurantId) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuPreviewRestaurantId]);

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
          <div className="space-y-10">
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
                {menuPlan.map((day, idx) => {
                  const isLunchRequired =
                    day.option === "lunch" || day.option === "both";
                  const isDinnerRequired =
                    day.option === "dinner" || day.option === "both";
                  const dayHasIssue =
                    (isLunchRequired &&
                      (!day.lunchCity ||
                        !day.lunchRestaurantId ||
                        !day.lunchMenuName)) ||
                    (isDinnerRequired &&
                      (!day.dinnerCity ||
                        !day.dinnerRestaurantId ||
                        !day.dinnerMenuName));

                  return (
                    <div
                      key={day.date}
                      className={`rounded-2xl border bg-white shadow-sm overflow-hidden ${
                        dayHasIssue ? "border-red-200" : "border-slate-200"
                      }`}
                    >
                    <div className="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)]">
                      <div className="border-b border-slate-100 bg-slate-50 p-5 xl:border-b-0 xl:border-r">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Day {idx + 1}
                        </div>
                        <div className="mt-1 text-lg font-bold text-secondary">
                          {new Date(day.date).toLocaleDateString("vi-VN")}
                        </div>
                        <select
                          className="mt-4 w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-primary/10"
                          value={day.option}
                          onChange={(event) =>
                            updateMenuPlanDay(idx, {
                              option: event.target.value as MenuPlanDay["option"],
                            })
                          }
                        >
                          <option value="both">Cả hai bữa</option>
                          <option value="lunch">Chỉ bữa trưa</option>
                          <option value="dinner">Chỉ bữa tối</option>
                          <option value="na">N/A</option>
                        </select>
                      </div>
                      <div
                        className={`grid gap-4 p-5 ${
                          day.option === "both"
                            ? "lg:grid-cols-2"
                            : "lg:grid-cols-1"
                        }`}
                      >
                        <MealSelectors
                          label="Trưa"
                          enabled={day.option === "lunch" || day.option === "both"}
                          cities={cities}
                          restaurants={restaurants}
                          menus={menus}
                          city={day.lunchCity}
                          restaurantId={day.lunchRestaurantId}
                          menuName={day.lunchMenuName}
                          required={isLunchRequired}
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
                          required={isDinnerRequired}
                          onChange={(updates) => updateMenuPlanDay(idx, { dinnerCity: updates.city, dinnerRestaurantId: updates.restaurantId, dinnerMenuName: updates.menuName })}
                        />
                        {day.option === "na" && (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-400">
                            Không sử dụng menu cho ngày này.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
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
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <Database className="text-primary" size={28} /> Cơ sở dữ liệu Nhà hàng
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("hello-maya:navigate", {
                        detail: { mode: "database", databaseTab: "restaurants" },
                      }),
                    );
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20"
                >
                  <Database size={18} />
                  Quản lý nhà hàng
                </button>
              </div>
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
                {filteredRestaurants.map((restaurant) => {
                    const restaurantMenus = menus.filter(
                      (menu) => menu.restaurantId === restaurant.id,
                    );

                    return (
                      <button
                        key={restaurant.id}
                        type="button"
                        onClick={() => setMenuPreviewRestaurantId(restaurant.id)}
                        className="p-5 rounded-2xl border border-gray-100 bg-white text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-primary/10"
                      >
                        <h3 className="font-bold text-secondary flex items-center gap-2">
                          <Utensils size={18} /> {restaurant.name}
                        </h3>
                        <p className="text-sm text-gray-500">{restaurant.city}</p>
                        <p className="text-sm text-gray-500">{restaurant.address}</p>
                        <span className="mt-3 inline-flex rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
                          {restaurantMenus.length} menu
                        </span>
                      </button>
                    );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      {previewRestaurant && (
        <RestaurantMenusModal
          restaurant={previewRestaurant}
          menus={previewMenus}
          onClose={() => setMenuPreviewRestaurantId(null)}
        />
      )}
    </motion.div>
  );
}

function RestaurantMenusModal({
  restaurant,
  menus,
  onClose,
}: {
  restaurant: Restaurant;
  menus: RestaurantMenu[];
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
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950">
              {restaurant.name}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {restaurant.city}
              {restaurant.address ? ` · ${restaurant.address}` : ""}
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
          {menus.length > 0 ? (
            <div className="space-y-4">
              {menus.map((menu, index) => (
                <div
                  key={`${menu.menuName}-${index}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="font-bold text-slate-950">{menu.menuName}</div>
                  {menu.detail && (
                    <div className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                      {menu.detail}
                    </div>
                  )}
                  {menu.note && (
                    <div className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                      Note: {menu.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
              Nhà hàng này chưa có menu.
            </div>
          )}
        </div>
      </motion.div>
    </div>
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
  required,
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
  required: boolean;
  onChange: (updates: { city?: string; restaurantId?: string; menuName?: string }) => void;
}) {
  if (!enabled) return null;

  const restaurantMenus = menus.filter((menu) => menu.restaurantId === restaurantId);
  const selectedRestaurantHasNoMenus = Boolean(restaurantId) && restaurantMenus.length === 0;
  const fieldClass = (invalid: boolean) =>
    `w-full px-3 py-2.5 rounded-xl border bg-white text-sm outline-none focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100 disabled:text-slate-400 ${
      invalid ? "border-red-300 bg-red-50/40" : "border-slate-200"
    }`;

  return (
    <div
      className={`rounded-2xl border bg-slate-50/70 p-4 ${
        required &&
        (!city || !restaurantId || !menuName || selectedRestaurantHasNoMenus)
          ? "border-red-200"
          : "border-slate-200"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="font-bold text-slate-900">{label}</div>
        <div className="h-2 w-2 rounded-full bg-primary" />
      </div>
      <div className="grid grid-cols-1 gap-3">
      <select className={fieldClass(required && !city)} value={city || ""} onChange={(event) => onChange({ city: event.target.value, restaurantId: "", menuName: "" })}>
        <option value="">{label}: thành phố</option>
        {cities.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <select className={fieldClass(required && !restaurantId)} disabled={!city} value={restaurantId || ""} onChange={(event) => onChange({ city, restaurantId: event.target.value, menuName: "" })}>
        <option value="">Nhà hàng</option>
        {restaurants
          .filter((restaurant) => restaurant.city === city)
          .map((restaurant) => (
            <option key={restaurant.id} value={restaurant.id}>
              {restaurant.name}
            </option>
          ))}
      </select>
      <select className={fieldClass(required && (!menuName || selectedRestaurantHasNoMenus))} disabled={!restaurantId || selectedRestaurantHasNoMenus} value={menuName || ""} onChange={(event) => onChange({ city, restaurantId, menuName: event.target.value })}>
        <option value="">Menu</option>
        {restaurantMenus.map((menu, idx) => (
            <option key={`${menu.menuName}-${idx}`} value={menu.menuName}>
              {menu.menuName}
            </option>
          ))}
      </select>
      {selectedRestaurantHasNoMenus && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          Nhà hàng này chưa có menu. Vui lòng thêm menu trong Database trước.
        </div>
      )}
      {required && !selectedRestaurantHasNoMenus && (!city || !restaurantId || !menuName) && (
        <div className="text-xs font-semibold text-red-600">
          Vui lòng chọn đủ thành phố, nhà hàng và menu cho bữa {label.toLowerCase()}.
        </div>
      )}
      </div>
    </div>
  );
}
