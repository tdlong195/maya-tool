import type { GuideData, Restaurant, RestaurantMenu } from "../types/domain";

const GUIDE_DB_KEY = "contract-auto-filter.guides";
const RESTAURANT_DB_KEY = "contract-auto-filter.restaurants";
const RESTAURANT_MENU_DB_KEY = "contract-auto-filter.restaurant-menus";

const readJson = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (err) {
    console.warn(`Failed to read local database key ${key}`, err);
    return fallback;
  }
};

const writeJson = <T>(key: string, value: T) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const localDatabase = {
  getGuides: () => readJson<GuideData[]>(GUIDE_DB_KEY, []),
  saveGuides: (guides: GuideData[]) => writeJson(GUIDE_DB_KEY, guides),
  getRestaurants: () => readJson<Restaurant[]>(RESTAURANT_DB_KEY, []),
  saveRestaurants: (restaurants: Restaurant[]) =>
    writeJson(RESTAURANT_DB_KEY, restaurants),
  getRestaurantMenus: () =>
    readJson<RestaurantMenu[]>(RESTAURANT_MENU_DB_KEY, []),
  saveRestaurantMenus: (menus: RestaurantMenu[]) =>
    writeJson(RESTAURANT_MENU_DB_KEY, menus),
};
