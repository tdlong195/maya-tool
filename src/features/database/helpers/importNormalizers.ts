import type {
  GuideData,
  Restaurant,
  RestaurantMenu,
} from "../../../shared/types/domain";
import { removeAccents } from "../../../shared/utils";

export const getCell = (row: Record<string, unknown>, aliases: string[]) => {
  const key = Object.keys(row).find((candidate) =>
    aliases.some(
      (alias) =>
        removeAccents(candidate.toLowerCase().trim()) ===
        removeAccents(alias.toLowerCase()),
    ),
  );
  return key ? String(row[key] ?? "").trim() : "";
};

export const normalizeGuide = (
  row: Record<string, unknown>,
  index: number,
  fallbackId: string,
): GuideData => ({
  Id: getCell(row, ["Id", "ID", "Mã HDV"]) || `${fallbackId}-${index + 1}`,
  City: getCell(row, ["City", "Thành phố", "Tinh", "Tỉnh"]),
  Name: getCell(row, ["Name", "Tên", "Họ và tên", "Ho va ten"]),
  Address: getCell(row, ["Address", "Địa chỉ", "Dia chi"]),
  DoB: getCell(row, ["DoB", "DOB", "Ngày sinh", "Ngay sinh"]),
  Sex: getCell(row, ["Sex", "Gender", "Giới tính", "Gioi tinh"]),
  idNumber: getCell(row, ["idNumber", "CCCD", "Số căn cước", "So can cuoc"]),
  Expire: getCell(row, ["Expire", "Hạn căn cước", "Han can cuoc"]),
  GuideID: getCell(row, ["GuideID", "Số thẻ HDV", "So the HDV", "Thẻ HDV"]),
  GuideExpire: getCell(row, ["GuideExpire", "Hạn thẻ HDV", "Han the HDV"]),
  sdt: getCell(row, ["sdt", "SDT", "SĐT", "Phone", "Số điện thoại"]),
  stk: getCell(row, ["stk", "STK", "Bank", "Số tài khoản"]),
});

export const normalizeRestaurant = (
  row: Record<string, unknown>,
  index: number,
  fallbackId: string,
): Restaurant => ({
  id: getCell(row, ["id", "ID", "Mã", "Mã nhà hàng"]) || `${fallbackId}-${index + 1}`,
  city: getCell(row, ["city", "City", "Thành phố", "Tỉnh"]),
  name: getCell(row, ["name", "Tên", "Tên nhà hàng", "Restaurant Name"]),
  address: getCell(row, ["address", "Địa chỉ", "Address"]),
  phone: getCell(row, ["phone", "SDT", "SĐT", "Số điện thoại"]),
  email: getCell(row, ["email", "Email"]),
  contactPerson: getCell(row, ["contactPerson", "Người liên hệ", "Contact"]),
  note: getCell(row, ["note", "Ghi chú", "Note"]),
});

export const normalizeMenu = (row: Record<string, unknown>): RestaurantMenu => ({
  restaurantId: getCell(row, ["ID nhà hàng", "Restaurant ID", "Mã nhà hàng"]),
  menuName: getCell(row, ["Menu name", "Tên menu", "Menu"]),
  detail: getCell(row, ["Detail", "Chi tiết", "Nội dung"]),
  note: getCell(row, ["NOTE", "Ghi chú", "Lưu ý"]),
});
