import { Type } from "@google/genai";
import {
  AlertCircle,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
} from "lucide-react";
import { useRef, useState } from "react";
import { ai } from "../../../shared/services";
import type { Restaurant, RestaurantMenu } from "../../../shared/types/domain";
import { getGeminiErrorMessage } from "../helpers/errors";
import {
  fileToBase64,
  supportedImageTypes,
} from "../helpers/geminiExtraction";
import { CityField, Field, FormActions } from "./DatabaseFields";

type RestaurantFormProps = {
  draft: Restaurant;
  editing: boolean;
  onChange: (restaurant: Restaurant) => void;
  onCancel: () => void;
  onSave: () => void;
};

export function RestaurantForm({
  draft,
  editing,
  onChange,
  onCancel,
  onSave,
}: RestaurantFormProps) {
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

type MenuFormProps = {
  draft: RestaurantMenu;
  editing: boolean;
  restaurants: Restaurant[];
  onChange: (menu: RestaurantMenu) => void;
  onCancel: () => void;
  onSave: () => void;
};

export function MenuForm({
  draft,
  editing,
  restaurants,
  onChange,
  onCancel,
  onSave,
}: MenuFormProps) {
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
