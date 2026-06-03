import type { ReactNode } from "react";
import { AlertCircle, RefreshCw, Trash2, X } from "lucide-react";
import { motion } from "motion/react";
import type { Restaurant, RestaurantMenu } from "../../../shared/types/domain";
import type { PendingImport } from "../types";

type SingleDeleteDialogProps = {
  label: string;
  typeLabel: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function SingleDeleteDialog({
  label,
  typeLabel,
  onClose,
  onConfirm,
}: SingleDeleteDialogProps) {
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

type BulkDeleteDialogProps = {
  count: number;
  label: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function BulkDeleteDialog({
  count,
  label,
  onClose,
  onConfirm,
}: BulkDeleteDialogProps) {
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

type DatabaseErrorDialogProps = {
  title: string;
  message: string;
  onClose: () => void;
};

export function DatabaseErrorDialog({
  title,
  message,
  onClose,
}: DatabaseErrorDialogProps) {
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

type SyncErrorDialogProps = {
  message: string;
  onClose: () => void;
  onRetry: () => void;
};

export function SyncErrorDialog({
  message,
  onClose,
  onRetry,
}: SyncErrorDialogProps) {
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

type ImportConfirmModalProps = {
  pendingImport: PendingImport;
  onClose: () => void;
  onReplace: () => void;
  onMerge: () => void;
};

export function ImportConfirmModal({
  pendingImport,
  onClose,
  onReplace,
  onMerge,
}: ImportConfirmModalProps) {
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

type EditorModalProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function EditorModal({ title, children, onClose }: EditorModalProps) {
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

type MenuDetailModalProps = {
  menu: RestaurantMenu;
  restaurant?: Restaurant;
  onClose: () => void;
  onEdit: () => void;
};

export function MenuDetailModal({
  menu,
  restaurant,
  onClose,
  onEdit,
}: MenuDetailModalProps) {
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
