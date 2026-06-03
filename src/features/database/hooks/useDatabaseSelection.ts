import { useState } from "react";
import type { DbTab } from "../types";

const toggleValue = (values: string[], value: string) =>
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];

const togglePageValues = (values: string[], pageValues: string[]) => {
  const hasAll = pageValues.every((value) => values.includes(value));
  return hasAll
    ? values.filter((value) => !pageValues.includes(value))
    : Array.from(new Set([...values, ...pageValues]));
};

export function useDatabaseSelection(tab: DbTab) {
  const [selectedGuideIds, setSelectedGuideIds] = useState<string[]>([]);
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<string[]>(
    [],
  );
  const [selectedMenuKeys, setSelectedMenuKeys] = useState<string[]>([]);

  const currentSelectedIds =
    tab === "guides"
      ? selectedGuideIds
      : tab === "restaurants"
        ? selectedRestaurantIds
        : selectedMenuKeys;

  const clearGuideSelection = () => setSelectedGuideIds([]);
  const clearRestaurantSelection = () => setSelectedRestaurantIds([]);
  const clearMenuSelection = () => setSelectedMenuKeys([]);

  const clearAllSelections = () => {
    clearGuideSelection();
    clearRestaurantSelection();
    clearMenuSelection();
  };

  const clearCurrentSelection = () => {
    if (tab === "guides") clearGuideSelection();
    else if (tab === "restaurants") clearRestaurantSelection();
    else clearMenuSelection();
  };

  const toggleGuideSelected = (id: string) =>
    setSelectedGuideIds((ids) => toggleValue(ids, id));

  const toggleRestaurantSelected = (id: string) =>
    setSelectedRestaurantIds((ids) => toggleValue(ids, id));

  const toggleMenuSelected = (key: string) =>
    setSelectedMenuKeys((keys) => toggleValue(keys, key));

  const toggleGuidePage = (ids: string[]) =>
    setSelectedGuideIds((selectedIds) => togglePageValues(selectedIds, ids));

  const toggleRestaurantPage = (ids: string[]) =>
    setSelectedRestaurantIds((selectedIds) =>
      togglePageValues(selectedIds, ids),
    );

  const toggleMenuPage = (keys: string[]) =>
    setSelectedMenuKeys((selectedKeys) => togglePageValues(selectedKeys, keys));

  const removeGuideSelection = (id: string) =>
    setSelectedGuideIds((ids) => ids.filter((item) => item !== id));

  const removeRestaurantSelection = (id: string) =>
    setSelectedRestaurantIds((ids) => ids.filter((item) => item !== id));

  const removeMenuSelection = (key: string) =>
    setSelectedMenuKeys((keys) => keys.filter((item) => item !== key));

  const removeMenusForRestaurantSelection = (id: string) =>
    setSelectedMenuKeys((keys) =>
      keys.filter((key) => !key.startsWith(`${id}::`)),
    );

  const removeMenusForRestaurantsSelection = (ids: string[]) =>
    setSelectedMenuKeys((keys) =>
      keys.filter((key) => !ids.some((id) => key.startsWith(`${id}::`))),
    );

  return {
    selectedGuideIds,
    selectedRestaurantIds,
    selectedMenuKeys,
    currentSelectedIds,
    clearAllSelections,
    clearCurrentSelection,
    clearGuideSelection,
    clearRestaurantSelection,
    clearMenuSelection,
    toggleGuideSelected,
    toggleRestaurantSelected,
    toggleMenuSelected,
    toggleGuidePage,
    toggleRestaurantPage,
    toggleMenuPage,
    removeGuideSelection,
    removeRestaurantSelection,
    removeMenuSelection,
    removeMenusForRestaurantSelection,
    removeMenusForRestaurantsSelection,
  };
}
