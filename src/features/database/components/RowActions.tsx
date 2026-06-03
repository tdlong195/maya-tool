import { Pencil, Trash2 } from "lucide-react";

type RowActionsProps = {
  onEdit: () => void;
  onRemove: () => void;
};

export function RowActions({ onEdit, onRemove }: RowActionsProps) {
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
