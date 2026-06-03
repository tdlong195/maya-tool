import type {
  GuideData,
  Restaurant,
  RestaurantMenu,
} from "../../../shared/types/domain";
import { getMenuKey } from "./records";

export const mergeGuidesById = (
  imported: GuideData[],
  current: GuideData[],
) => [
  ...imported,
  ...current.filter(
    (guide) => !imported.some((item) => item.Id === guide.Id),
  ),
];

export const mergeRestaurantsById = (
  imported: Restaurant[],
  current: Restaurant[],
) => [
  ...imported,
  ...current.filter(
    (restaurant) => !imported.some((item) => item.id === restaurant.id),
  ),
];

export const mergeMenusByKey = (
  imported: RestaurantMenu[],
  current: RestaurantMenu[],
) => [
  ...imported,
  ...current.filter(
    (menu) => !imported.some((item) => getMenuKey(item) === getMenuKey(menu)),
  ),
];
