import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { appDatabase } from "../../../shared/services";
import type {
  GuideData,
  Restaurant,
  RestaurantMenu,
} from "../../../shared/types/domain";
import type { DbTab, PendingImport } from "../types";
import { getDatabaseErrorMessage } from "../helpers/errors";
import {
  mergeGuidesById,
  mergeMenusByKey,
  mergeRestaurantsById,
} from "../helpers/importMerge";
import { parseDatabaseWorkbook } from "../helpers/parseDatabaseWorkbook";
import { getMenuKey, nextCode, parseMenuKey } from "../helpers/records";

type NoticeType = "success" | "error";

type DatabaseError = {
  title: string;
  message: string;
};

type BulkDeleteRequest = {
  tab: DbTab;
  ids: string[];
};

type SingleDeleteRequest = {
  tab: DbTab;
  id: string;
  label: string;
};

type UseDatabaseMutationsParams = {
  tab: DbTab;
  guides: GuideData[];
  restaurants: Restaurant[];
  menus: RestaurantMenu[];
  guideDraft: GuideData;
  restaurantDraft: Restaurant;
  menuDraft: RestaurantMenu;
  editingId: string | null;
  currentSelectedIds: string[];
  setGuides: Dispatch<SetStateAction<GuideData[]>>;
  setRestaurants: Dispatch<SetStateAction<Restaurant[]>>;
  setMenus: Dispatch<SetStateAction<RestaurantMenu[]>>;
  setIsEditorOpen: Dispatch<SetStateAction<boolean>>;
  resetGuideDraft: (guides?: GuideData[]) => void;
  resetRestaurantDraft: (restaurants?: Restaurant[]) => void;
  resetMenuDraft: () => void;
  clearAllSelections: () => void;
  clearGuideSelection: () => void;
  clearRestaurantSelection: () => void;
  clearMenuSelection: () => void;
  removeGuideSelection: (id: string) => void;
  removeRestaurantSelection: (id: string) => void;
  removeMenuSelection: (key: string) => void;
  removeMenusForRestaurantSelection: (id: string) => void;
  removeMenusForRestaurantsSelection: (ids: string[]) => void;
  showNotice: (type: NoticeType, message: string) => void;
};

export function useDatabaseMutations({
  tab,
  guides,
  restaurants,
  menus,
  guideDraft,
  restaurantDraft,
  menuDraft,
  editingId,
  currentSelectedIds,
  setGuides,
  setRestaurants,
  setMenus,
  setIsEditorOpen,
  resetGuideDraft,
  resetRestaurantDraft,
  resetMenuDraft,
  clearAllSelections,
  clearGuideSelection,
  clearRestaurantSelection,
  clearMenuSelection,
  removeGuideSelection,
  removeRestaurantSelection,
  removeMenuSelection,
  removeMenusForRestaurantSelection,
  removeMenusForRestaurantsSelection,
  showNotice,
}: UseDatabaseMutationsParams) {
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [databaseError, setDatabaseError] = useState<DatabaseError | null>(null);
  const [bulkDeleteRequest, setBulkDeleteRequest] =
    useState<BulkDeleteRequest | null>(null);
  const [singleDeleteRequest, setSingleDeleteRequest] =
    useState<SingleDeleteRequest | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const nextGuideId = () => nextCode("HDV", guides.map((guide) => guide.Id));
  const nextRestaurantId = () =>
    nextCode("NH", restaurants.map((restaurant) => restaurant.id));

  const syncDatabase = async ({
    showAlert = true,
    showSuccess = true,
  }: {
    showAlert?: boolean;
    showSuccess?: boolean;
  } = {}) => {
    setIsSyncing(true);
    try {
      const [nextGuides, nextRestaurants, nextMenus] = await Promise.all([
        appDatabase.getGuides(),
        appDatabase.getRestaurants(),
        appDatabase.getRestaurantMenus(),
      ]);
      setGuides(nextGuides);
      setRestaurants(nextRestaurants);
      setMenus(nextMenus);
      clearAllSelections();
      resetGuideDraft(nextGuides);
      resetRestaurantDraft(nextRestaurants);
      resetMenuDraft();
      if (showSuccess) showNotice("success", "Đã sync dữ liệu mới nhất.");
    } catch (err) {
      console.error("Failed to sync app database:", err);
      const message =
        err instanceof Error
          ? err.message
          : "Không tải được dữ liệu từ database.";
      showNotice("error", "Không tải được dữ liệu từ database.");
      if (showAlert) {
        setSyncError(message);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const commitGuides = (next: GuideData[], throwOnError = false) => {
    setGuides(next);
    return appDatabase.saveGuides(next).catch((err) => {
      console.error("Failed to save guides:", err);
      showNotice("error", "Không lưu được HDV vào database.");
      if (throwOnError) throw err;
    });
  };

  const commitRestaurants = (next: Restaurant[], throwOnError = false) => {
    setRestaurants(next);
    return appDatabase.saveRestaurants(next).catch((err) => {
      console.error("Failed to save restaurants:", err);
      showNotice("error", "Không lưu được nhà hàng vào database.");
      if (throwOnError) throw err;
    });
  };

  const commitMenus = (next: RestaurantMenu[], throwOnError = false) => {
    setMenus(next);
    return appDatabase.saveRestaurantMenus(next).catch((err) => {
      console.error("Failed to save restaurant menus:", err);
      setDatabaseError({
        title: "Không lưu được menu vào database",
        message: getDatabaseErrorMessage(err),
      });
      showNotice("error", "Không lưu được menu vào database.");
      if (throwOnError) throw err;
    });
  };

  const stageImport = (nextImport: PendingImport) => {
    setPendingImport(nextImport);
  };

  const applyPendingImport = async (mode: "replace" | "merge") => {
    if (!pendingImport) return;

    try {
      if (pendingImport.tab === "guides" && pendingImport.guides) {
        const next =
          mode === "replace"
            ? pendingImport.guides
            : mergeGuidesById(pendingImport.guides, guides);
        if (mode === "replace") {
          await commitGuides(next, true);
        } else {
          await appDatabase.upsertGuides(pendingImport.guides);
          setGuides(next);
        }
        resetGuideDraft(next);
        clearGuideSelection();
        showNotice(
          "success",
          mode === "replace"
            ? `Đã thay thế database bằng ${pendingImport.guides.length} HDV.`
            : `Đã gộp/cập nhật ${pendingImport.guides.length} HDV.`,
        );
      }

      if (pendingImport.tab === "restaurants" && pendingImport.restaurants) {
        const nextRestaurants =
          mode === "replace"
            ? pendingImport.restaurants
            : mergeRestaurantsById(pendingImport.restaurants, restaurants);
        if (mode === "replace") {
          await commitRestaurants(nextRestaurants, true);
        } else {
          await appDatabase.upsertRestaurants(pendingImport.restaurants);
          setRestaurants(nextRestaurants);
        }
        resetRestaurantDraft(nextRestaurants);
        clearRestaurantSelection();

        if (pendingImport.menus) {
          const nextMenus =
            mode === "replace"
              ? pendingImport.menus
              : mergeMenusByKey(pendingImport.menus, menus);
          if (mode === "replace") {
            await commitMenus(nextMenus, true);
          } else {
            await appDatabase.upsertRestaurantMenus(pendingImport.menus);
            setMenus(nextMenus);
          }
          clearMenuSelection();
        }

        showNotice(
          "success",
          pendingImport.menus
            ? mode === "replace"
              ? `Đã thay thế ${pendingImport.restaurants.length} nhà hàng và ${pendingImport.menus.length} menu.`
              : `Đã gộp/cập nhật ${pendingImport.restaurants.length} nhà hàng và ${pendingImport.menus.length} menu.`
            : mode === "replace"
              ? `Đã thay thế database bằng ${pendingImport.restaurants.length} nhà hàng.`
              : `Đã gộp/cập nhật ${pendingImport.restaurants.length} nhà hàng.`,
        );
      }

      if (pendingImport.tab === "menus" && pendingImport.menus) {
        const next =
          mode === "replace"
            ? pendingImport.menus
            : mergeMenusByKey(pendingImport.menus, menus);
        if (mode === "replace") {
          await commitMenus(next, true);
        } else {
          await appDatabase.upsertRestaurantMenus(pendingImport.menus);
          setMenus(next);
        }
        resetMenuDraft();
        clearMenuSelection();
        showNotice(
          "success",
          mode === "replace"
            ? `Đã thay thế database bằng ${pendingImport.menus.length} menu.`
            : `Đã gộp/cập nhật ${pendingImport.menus.length} menu.`,
        );
      }

      setPendingImport(null);
    } catch (err) {
      console.error("Import failed:", err);
    }
  };

  const importWorkbook = async (file: File) => {
    try {
      stageImport(
        await parseDatabaseWorkbook({
          file,
          tab,
          nextGuideId: nextGuideId(),
          nextRestaurantId: nextRestaurantId(),
        }),
      );
    } catch (err) {
      showNotice(
        "error",
        err instanceof Error ? err.message : "Không đọc được file Excel/CSV.",
      );
    }
  };

  const saveGuideFromModal = async (guide: GuideData) => {
    const normalized = {
      ...guide,
      Id: editingId || guide.Id || nextGuideId(),
    };
    const next = editingId
      ? guides.map((item) => (item.Id === editingId ? normalized : item))
      : [normalized, ...guides];

    try {
      await appDatabase.upsertGuide(normalized);
      setGuides(next);
      resetGuideDraft(next);
      setIsEditorOpen(false);
      showNotice("success", "Đã lưu HDV.");
    } catch (err) {
      console.error("Failed to save guide:", err);
      showNotice("error", "Không lưu được HDV vào database.");
    }
  };

  const saveRestaurant = async () => {
    if (!restaurantDraft.name.trim()) {
      showNotice("error", "Tên nhà hàng là bắt buộc.");
      return;
    }

    const normalized = {
      ...restaurantDraft,
      id: editingId || restaurantDraft.id || nextRestaurantId(),
    };
    const next = editingId
      ? restaurants.map((restaurant) =>
          restaurant.id === editingId ? normalized : restaurant,
        )
      : [normalized, ...restaurants];

    try {
      await appDatabase.upsertRestaurant(normalized);
      setRestaurants(next);
      resetRestaurantDraft(next);
      setIsEditorOpen(false);
      showNotice("success", "Đã lưu nhà hàng.");
    } catch (err) {
      console.error("Failed to save restaurant:", err);
      showNotice("error", "Không lưu được nhà hàng vào database.");
    }
  };

  const saveMenu = async () => {
    if (!menuDraft.restaurantId || !menuDraft.menuName.trim()) {
      showNotice("error", "Nhà hàng và tên menu là bắt buộc.");
      return;
    }

    const normalized = {
      ...menuDraft,
      menuName: menuDraft.menuName.trim(),
    };
    const nextKey = getMenuKey(normalized);
    const duplicate = menus.some(
      (menu) => getMenuKey(menu) === nextKey && getMenuKey(menu) !== editingId,
    );
    if (duplicate) {
      showNotice("error", "Menu này đã tồn tại cho nhà hàng đã chọn.");
      return;
    }

    const next = editingId
      ? menus.map((menu) => (getMenuKey(menu) === editingId ? normalized : menu))
      : [normalized, ...menus];

    try {
      await appDatabase.upsertRestaurantMenu(normalized);
      if (editingId && editingId !== nextKey) {
        await appDatabase.deleteRestaurantMenus([parseMenuKey(editingId)]);
      }
      setMenus(next);
      resetMenuDraft();
      setIsEditorOpen(false);
      showNotice("success", "Đã lưu menu.");
    } catch (err) {
      console.error("Failed to save restaurant menu:", err);
      setDatabaseError({
        title: "Không lưu được menu vào database",
        message: getDatabaseErrorMessage(err),
      });
      showNotice("error", "Không lưu được menu vào database.");
    }
  };

  const removeGuide = async (id: string) => {
    const next = guides.filter((guide) => guide.Id !== id);
    try {
      await appDatabase.deleteGuides([id]);
      setGuides(next);
      removeGuideSelection(id);
      resetGuideDraft(next);
      showNotice("success", "Đã xóa HDV.");
    } catch (err) {
      console.error("Failed to delete guide:", err);
      showNotice("error", "Không xóa được HDV khỏi database.");
    }
  };

  const removeRestaurant = async (id: string) => {
    const next = restaurants.filter((restaurant) => restaurant.id !== id);
    const nextMenus = menus.filter((menu) => menu.restaurantId !== id);
    try {
      await appDatabase.deleteRestaurantsWithMenus([id]);
      setRestaurants(next);
      setMenus(nextMenus);
      removeRestaurantSelection(id);
      removeMenusForRestaurantSelection(id);
      resetRestaurantDraft(next);
      showNotice("success", "Đã xóa nhà hàng.");
    } catch (err) {
      console.error("Failed to delete restaurant:", err);
      showNotice("error", "Không xóa được nhà hàng khỏi database.");
    }
  };

  const removeMenu = async (key: string) => {
    const next = menus.filter((menu) => getMenuKey(menu) !== key);
    try {
      await appDatabase.deleteRestaurantMenus([parseMenuKey(key)]);
      setMenus(next);
      removeMenuSelection(key);
      resetMenuDraft();
      showNotice("success", "Đã xóa menu.");
    } catch (err) {
      console.error("Failed to delete restaurant menu:", err);
      setDatabaseError({
        title: "Không xóa được menu khỏi database",
        message: getDatabaseErrorMessage(err),
      });
      showNotice("error", "Không xóa được menu khỏi database.");
    }
  };

  const requestRemoveGuide = (guide: GuideData) => {
    setSingleDeleteRequest({
      tab: "guides",
      id: guide.Id,
      label: guide.Name || guide.Id,
    });
  };

  const requestRemoveRestaurant = (restaurant: Restaurant) => {
    setSingleDeleteRequest({
      tab: "restaurants",
      id: restaurant.id,
      label: restaurant.name || restaurant.id,
    });
  };

  const requestRemoveMenu = (menu: RestaurantMenu) => {
    setSingleDeleteRequest({
      tab: "menus",
      id: getMenuKey(menu),
      label: menu.menuName || getMenuKey(menu),
    });
  };

  const confirmSingleDelete = async () => {
    if (!singleDeleteRequest) return;
    if (singleDeleteRequest.tab === "guides") {
      await removeGuide(singleDeleteRequest.id);
    } else if (singleDeleteRequest.tab === "restaurants") {
      await removeRestaurant(singleDeleteRequest.id);
    } else {
      await removeMenu(singleDeleteRequest.id);
    }
    setSingleDeleteRequest(null);
  };

  const removeSelectedRows = () => {
    if (currentSelectedIds.length === 0) {
      showNotice("error", "Vui lòng chọn ít nhất một dòng để xóa.");
      return;
    }

    setBulkDeleteRequest({ tab, ids: currentSelectedIds });
  };

  const confirmBulkDelete = async () => {
    if (!bulkDeleteRequest) return;

    if (bulkDeleteRequest.tab === "guides") {
      const ids = new Set(bulkDeleteRequest.ids);
      const next = guides.filter((guide) => !ids.has(guide.Id));
      try {
        await appDatabase.deleteGuides(bulkDeleteRequest.ids);
        setGuides(next);
        clearGuideSelection();
        resetGuideDraft(next);
        showNotice("success", `Đã xóa ${ids.size} HDV.`);
        setBulkDeleteRequest(null);
      } catch (err) {
        console.error("Failed to bulk delete guides:", err);
        showNotice("error", "Không xóa được HDV khỏi database.");
      }
      return;
    }

    if (bulkDeleteRequest.tab === "restaurants") {
      const ids = new Set(bulkDeleteRequest.ids);
      const nextRestaurants = restaurants.filter(
        (restaurant) => !ids.has(restaurant.id),
      );
      const nextMenus = menus.filter((menu) => !ids.has(menu.restaurantId));
      try {
        await appDatabase.deleteRestaurantsWithMenus(bulkDeleteRequest.ids);
        setRestaurants(nextRestaurants);
        setMenus(nextMenus);
        clearRestaurantSelection();
        removeMenusForRestaurantsSelection(bulkDeleteRequest.ids);
        resetRestaurantDraft(nextRestaurants);
        showNotice("success", `Đã xóa ${ids.size} nhà hàng.`);
        setBulkDeleteRequest(null);
      } catch (err) {
        console.error("Failed to bulk delete restaurants:", err);
        showNotice("error", "Không xóa được nhà hàng khỏi database.");
      }
      return;
    }

    const keys = new Set(bulkDeleteRequest.ids);
    const next = menus.filter((menu) => !keys.has(getMenuKey(menu)));
    try {
      await appDatabase.deleteRestaurantMenus(bulkDeleteRequest.ids.map(parseMenuKey));
      setMenus(next);
      clearMenuSelection();
      resetMenuDraft();
      showNotice("success", `Đã xóa ${keys.size} menu.`);
      setBulkDeleteRequest(null);
    } catch (err) {
      console.error("Failed to bulk delete restaurant menus:", err);
      setDatabaseError({
        title: "Không xóa được menu khỏi database",
        message: getDatabaseErrorMessage(err),
      });
      showNotice("error", "Không xóa được menu khỏi database.");
    }
  };

  return {
    pendingImport,
    setPendingImport,
    syncError,
    setSyncError,
    databaseError,
    setDatabaseError,
    bulkDeleteRequest,
    setBulkDeleteRequest,
    singleDeleteRequest,
    setSingleDeleteRequest,
    isSyncing,
    syncDatabase,
    importWorkbook,
    applyPendingImport,
    saveGuideFromModal,
    saveRestaurant,
    saveMenu,
    requestRemoveGuide,
    requestRemoveRestaurant,
    requestRemoveMenu,
    confirmSingleDelete,
    removeSelectedRows,
    confirmBulkDelete,
  };
}
