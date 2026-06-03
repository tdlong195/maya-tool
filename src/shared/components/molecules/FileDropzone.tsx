import type { ComponentType, DragEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

type FileDropzoneProps = {
  accept: string;
  file?: File | null;
  helperText: string;
  inputId: string;
  isDragging?: boolean;
  isProcessing?: boolean;
  processingLabel: string;
  placeholder: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  onDragStateChange: (isDragging: boolean) => void;
  onFile: (file?: File) => void;
};

export function FileDropzone({
  accept,
  file,
  helperText,
  inputId,
  isDragging = false,
  isProcessing = false,
  processingLabel,
  placeholder,
  icon: Icon,
  onDragStateChange,
  onFile,
}: FileDropzoneProps) {
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    onDragStateChange(false);
    onFile(event.dataTransfer.files[0]);
  };

  return (
    <div
      className={`flex h-60 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white p-8 text-center transition-all outline-none focus:ring-4 focus:ring-primary/10 ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-slate-200 hover:border-primary/50 hover:bg-slate-50"
      }`}
      role="button"
      tabIndex={0}
      onDragOver={(event) => {
        event.preventDefault();
        onDragStateChange(true);
      }}
      onDragLeave={() => onDragStateChange(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById(inputId)?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          document.getElementById(inputId)?.click();
        }
      }}
    >
      <input
        id={inputId}
        type="file"
        className="hidden"
        accept={accept}
        onChange={(event) => {
          onFile(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      <div
        className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner transition-all ${
          isProcessing
            ? "bg-primary/10 text-primary"
            : file
              ? "bg-emerald-100 text-emerald-600"
              : "bg-primary/10 text-primary"
        }`}
      >
        {isProcessing ? (
          <Loader2 className="animate-spin" size={32} />
        ) : file ? (
          <CheckCircle2 size={32} />
        ) : (
          <Icon size={32} />
        )}
      </div>
      <h3 className="mb-2 text-lg font-bold text-slate-950">
        {isProcessing ? processingLabel : file ? file.name : placeholder}
      </h3>
      <p className="text-sm text-slate-500">{helperText}</p>
    </div>
  );
}
