import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type {
  GuideData,
  Restaurant,
  RestaurantMenu,
} from "../../../shared/types/domain";
import type { DbTab } from "../types";
import { formatDateForExport } from "./dateFormat";

type ExportCurrentTableParams = {
  tab: DbTab;
  guides: GuideData[];
  restaurants: Restaurant[];
  menus: RestaurantMenu[];
};

export const exportCurrentTable = async ({
  tab,
  guides,
  restaurants,
  menus,
}: ExportCurrentTableParams) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Contract Auto Filter";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(
    tab === "guides"
      ? "Database HDV"
      : tab === "restaurants"
        ? "TTNH"
        : "MENU",
    {
      views: [{ state: "frozen", ySplit: 1 }],
    },
  );

  if (tab === "guides") {
    worksheet.columns = [
      { header: "ID", key: "Id", width: 12 },
      { header: "Thành phố", key: "City", width: 16 },
      { header: "Họ và tên", key: "Name", width: 28 },
      { header: "Địa chỉ thường trú", key: "Address", width: 42 },
      { header: "Ngày sinh", key: "DoB", width: 14 },
      { header: "Giới tính", key: "Sex", width: 10 },
      { header: "CCCD", key: "idNumber", width: 18 },
      { header: "Hạn CCCD", key: "Expire", width: 14 },
      { header: "Số thẻ HDV", key: "GuideID", width: 18 },
      { header: "Hạn thẻ HDV", key: "GuideExpire", width: 14 },
      { header: "SĐT", key: "sdt", width: 16 },
      { header: "STK", key: "stk", width: 20 },
    ];

    guides.forEach((guide) => {
      worksheet.addRow({
        ...guide,
        DoB: formatDateForExport(guide.DoB),
        Expire: formatDateForExport(guide.Expire),
        GuideExpire: formatDateForExport(guide.GuideExpire),
      });
    });
  } else if (tab === "restaurants") {
    worksheet.columns = [
      { header: "Mã", key: "id", width: 12 },
      { header: "Thành phố", key: "city", width: 16 },
      { header: "Tên nhà hàng", key: "name", width: 30 },
      { header: "Địa chỉ", key: "address", width: 42 },
      { header: "SĐT", key: "phone", width: 16 },
      { header: "Email", key: "email", width: 26 },
      { header: "Người liên hệ", key: "contactPerson", width: 22 },
      { header: "Ghi chú", key: "note", width: 34 },
    ];

    restaurants.forEach((restaurant) => worksheet.addRow(restaurant));
  } else {
    worksheet.columns = [
      { header: "ID nhà hàng", key: "restaurantId", width: 16 },
      { header: "Menu name", key: "menuName", width: 28 },
      { header: "Detail", key: "detail", width: 56 },
      { header: "NOTE", key: "note", width: 34 },
    ];

    menus.forEach((menu) => worksheet.addRow(menu));
  }

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: worksheet.columnCount },
  };

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      cell.alignment = {
        vertical: "middle",
        wrapText: true,
      };

      if (rowNumber === 1) {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF334155" },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true,
        };
      }
    });

    if (rowNumber > 1) {
      row.height = 28;
      if (rowNumber % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8FAFC" },
          };
        });
      }
    }
  });

  worksheet.getRow(1).height = 30;

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    tab === "guides"
      ? "database-hdv.xlsx"
      : tab === "restaurants"
        ? "database-nha-hang.xlsx"
        : "database-menu.xlsx",
  );
};
