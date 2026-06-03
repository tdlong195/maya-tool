export const getGeminiErrorMessage = (err: unknown) => {
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

export const getDatabaseErrorMessage = (err: unknown) => {
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
