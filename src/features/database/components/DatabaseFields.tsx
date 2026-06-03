import { Save } from "lucide-react";
import { CITY_OPTIONS } from "../../../shared/constants/cities";

type FieldProps = {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  type?: "text" | "date" | "tel" | "email";
};

export function Field({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
  type = "text",
}: FieldProps) {
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

type CityFieldProps = {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
};

export function CityField({
  label = "Thành phố",
  value,
  onChange,
}: CityFieldProps) {
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

type FormActionsProps = {
  editing: boolean;
  onCancel: () => void;
  onSave: () => void;
};

export function FormActions({
  editing,
  onCancel,
  onSave,
}: FormActionsProps) {
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
