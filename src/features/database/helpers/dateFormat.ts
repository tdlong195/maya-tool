const toDateInputValue = (value?: string) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return "";
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

export const formatDateForExport = (value?: string) => {
  if (!value) return "";
  const inputValue = toDateInputValue(value);
  if (!inputValue) return value;
  const [year, month, day] = inputValue.split("-");
  return `${day}/${month}/${year}`;
};
