import * as XLSX from "xlsx";
import type { DbTab, PendingImport } from "../types";
import {
  normalizeGuide,
  normalizeMenu,
  normalizeRestaurant,
} from "./importNormalizers";

type ParseDatabaseWorkbookParams = {
  file: File;
  tab: DbTab;
  nextGuideId: string;
  nextRestaurantId: string;
};

export const parseDatabaseWorkbook = async ({
  file,
  tab,
  nextGuideId,
  nextRestaurantId,
}: ParseDatabaseWorkbookParams): Promise<PendingImport> => {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const firstSheetRows = () =>
    XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[workbook.SheetNames[0]],
    );

  if (tab === "guides") {
    const imported = firstSheetRows()
      .map((row, index) => normalizeGuide(row, index, nextGuideId))
      .filter((guide) => guide.Name);
    if (!imported.length) throw new Error("Không tìm thấy dòng HDV hợp lệ.");
    return { tab, guides: imported };
  }

  const ttnhSheetName = workbook.SheetNames.find(
    (name) => name.toUpperCase() === "TTNH",
  );
  const menuSheetName = workbook.SheetNames.find(
    (name) => name.toUpperCase() === "MENU",
  );

  if (tab === "menus") {
    const rows = menuSheetName
      ? XLSX.utils.sheet_to_json<Record<string, unknown>>(
          workbook.Sheets[menuSheetName],
        )
      : firstSheetRows();
    const importedMenus = rows
      .map(normalizeMenu)
      .filter((menu) => menu.restaurantId && menu.menuName);
    if (!importedMenus.length) {
      throw new Error("Không tìm thấy dòng menu hợp lệ.");
    }
    return { tab, menus: importedMenus };
  }

  const restaurantRows = ttnhSheetName
    ? XLSX.utils.sheet_to_json<Record<string, unknown>>(
        workbook.Sheets[ttnhSheetName],
      )
    : firstSheetRows();
  const imported = restaurantRows
    .map((row, index) => normalizeRestaurant(row, index, nextRestaurantId))
    .filter((restaurant) => restaurant.name);
  if (!imported.length) {
    throw new Error("Không tìm thấy dòng nhà hàng hợp lệ.");
  }

  if (menuSheetName) {
    const importedMenus = XLSX.utils
      .sheet_to_json<Record<string, unknown>>(workbook.Sheets[menuSheetName])
      .map(normalizeMenu)
      .filter((menu) => menu.restaurantId && menu.menuName);
    return { tab, restaurants: imported, menus: importedMenus };
  }

  return { tab, restaurants: imported };
};
