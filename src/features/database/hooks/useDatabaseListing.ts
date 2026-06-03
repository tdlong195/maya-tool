import { useMemo, useState } from "react";
import type {
  GuideData,
  Restaurant,
  RestaurantMenu,
} from "../../../shared/types/domain";
import { removeAccents } from "../../../shared/utils";
import type { DbTab } from "../types";
import { compareRecordId } from "../helpers/records";

type UseDatabaseListingParams = {
  tab: DbTab;
  guides: GuideData[];
  restaurants: Restaurant[];
  menus: RestaurantMenu[];
};

export function useDatabaseListing({
  tab,
  guides,
  restaurants,
  menus,
}: UseDatabaseListingParams) {
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [guidePage, setGuidePage] = useState(1);
  const [restaurantPage, setRestaurantPage] = useState(1);
  const [menuPage, setMenuPage] = useState(1);

  const cities = useMemo(() => {
    const source =
      tab === "guides"
        ? guides.map((guide) => guide.City)
        : restaurants.map((restaurant) => restaurant.city);
    return Array.from(new Set(source.filter(Boolean))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [guides, restaurants, tab]);

  const filteredGuides = useMemo(() => {
    const needle = removeAccents(query.toLowerCase());
    return guides
      .filter((guide) => {
        const haystack = removeAccents(
          `${guide.Id} ${guide.Name} ${guide.City} ${guide.sdt} ${guide.GuideID}`.toLowerCase(),
        );
        return (
          (!query || haystack.includes(needle)) &&
          (!cityFilter || guide.City === cityFilter)
        );
      })
      .sort((left, right) => compareRecordId(left.Id, right.Id));
  }, [cityFilter, guides, query]);

  const filteredRestaurants = useMemo(() => {
    const needle = removeAccents(query.toLowerCase());
    return restaurants.filter((restaurant) => {
      const haystack = removeAccents(
        `${restaurant.id} ${restaurant.name} ${restaurant.city} ${restaurant.phone} ${restaurant.address}`.toLowerCase(),
      );
      return (
        (!query || haystack.includes(needle)) &&
        (!cityFilter || restaurant.city === cityFilter)
      );
    });
  }, [cityFilter, query, restaurants]);

  const filteredMenus = useMemo(() => {
    const needle = removeAccents(query.toLowerCase());
    return menus.filter((menu) => {
      const restaurant = restaurants.find((item) => item.id === menu.restaurantId);
      const haystack = removeAccents(
        `${menu.restaurantId} ${restaurant?.name || ""} ${restaurant?.city || ""} ${menu.menuName} ${menu.detail} ${menu.note}`.toLowerCase(),
      );
      return (
        (!query || haystack.includes(needle)) &&
        (!cityFilter || restaurant?.city === cityFilter)
      );
    });
  }, [cityFilter, menus, query, restaurants]);

  const guidePageCount = Math.max(
    1,
    Math.ceil(filteredGuides.length / pageSize),
  );
  const restaurantPageCount = Math.max(
    1,
    Math.ceil(filteredRestaurants.length / pageSize),
  );
  const menuPageCount = Math.max(1, Math.ceil(filteredMenus.length / pageSize));
  const safeGuidePage = Math.min(guidePage, guidePageCount);
  const safeRestaurantPage = Math.min(restaurantPage, restaurantPageCount);
  const safeMenuPage = Math.min(menuPage, menuPageCount);

  const pagedGuides = filteredGuides.slice(
    (safeGuidePage - 1) * pageSize,
    safeGuidePage * pageSize,
  );
  const pagedRestaurants = filteredRestaurants.slice(
    (safeRestaurantPage - 1) * pageSize,
    safeRestaurantPage * pageSize,
  );
  const pagedMenus = filteredMenus.slice(
    (safeMenuPage - 1) * pageSize,
    safeMenuPage * pageSize,
  );

  const resetPages = () => {
    setGuidePage(1);
    setRestaurantPage(1);
    setMenuPage(1);
  };

  const updatePageSize = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    resetPages();
  };

  const resetFilters = () => {
    setQuery("");
    setCityFilter("");
    resetPages();
  };

  return {
    cities,
    cityFilter,
    filteredGuides,
    filteredMenus,
    filteredRestaurants,
    guidePageCount,
    menuPageCount,
    pageSize,
    pagedGuides,
    pagedMenus,
    pagedRestaurants,
    query,
    restaurantPageCount,
    safeGuidePage,
    safeMenuPage,
    safeRestaurantPage,
    setCityFilter,
    setGuidePage,
    setMenuPage,
    setQuery,
    setRestaurantPage,
    updatePageSize,
    resetFilters,
    resetPages,
  };
}
