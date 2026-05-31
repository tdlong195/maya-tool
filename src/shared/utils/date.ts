export const isExpired = (dateVal?: unknown) => {
  if (dateVal === undefined || dateVal === null) return false;

  let dateStr = "";
  if (typeof dateVal === "number") {
    const date = new Date((dateVal - 25569) * 86400000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  } else if (typeof dateVal === "string") {
    dateStr = dateVal;
  } else {
    return false;
  }

  const normalized = dateStr.toLowerCase().trim();
  if (
    normalized === "" ||
    normalized === "trống" ||
    normalized === "n/a" ||
    normalized === "không"
  )
    return false;

  try {
    let expiryDate: Date;
    if (normalized.includes("/")) {
      const parts = normalized.split("/");
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        expiryDate = new Date(y, m, d);
      } else {
        return false;
      }
    } else {
      expiryDate = new Date(dateStr);
    }

    if (isNaN(expiryDate.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expiryDate < today;
  } catch (e) {
    return false;
  }
};
