export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
  });

export const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export const normalizeGender = (value?: string) => {
  const lowered = (value || "").toLowerCase();
  if (lowered.includes("nam") || value === "M") return "M";
  if (lowered.includes("nữ") || lowered.includes("nu") || value === "F") {
    return "F";
  }
  return value || "";
};
