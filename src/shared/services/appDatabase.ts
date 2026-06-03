import { createClient } from "@supabase/supabase-js";
import type { GuideData, Restaurant, RestaurantMenu } from "../types/domain";
import { localDatabase } from "./localDatabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

const toGuideRow = (guide: GuideData) => ({
  id: guide.Id,
  city: guide.City,
  name: guide.Name,
  address: guide.Address,
  dob: guide.DoB,
  sex: guide.Sex,
  id_number: guide.idNumber || "",
  expire: guide.Expire,
  guide_id: guide.GuideID,
  guide_expire: guide.GuideExpire,
  phone: guide.sdt,
  bank_account: guide.stk,
});

const fromGuideRow = (row: any): GuideData => ({
  Id: row.id || "",
  City: row.city || "",
  Name: row.name || "",
  Address: row.address || "",
  DoB: row.dob || "",
  Sex: row.sex || "",
  idNumber: row.id_number || "",
  Expire: row.expire || "",
  GuideID: row.guide_id || "",
  GuideExpire: row.guide_expire || "",
  sdt: row.phone || "",
  stk: row.bank_account || "",
});

const compareRecordId = (left: string, right: string) => {
  const leftMatch = left.match(/^([^\d]*)(\d+)$/);
  const rightMatch = right.match(/^([^\d]*)(\d+)$/);

  if (leftMatch && rightMatch && leftMatch[1] === rightMatch[1]) {
    return Number(leftMatch[2]) - Number(rightMatch[2]);
  }

  return left.localeCompare(right, undefined, { numeric: true });
};

const toRestaurantRow = (restaurant: Restaurant) => ({
  id: restaurant.id,
  city: restaurant.city,
  name: restaurant.name,
  address: restaurant.address,
  phone: restaurant.phone,
  email: restaurant.email,
  contact_person: restaurant.contactPerson || "",
  note: restaurant.note || "",
});

const fromRestaurantRow = (row: any): Restaurant => ({
  id: row.id || "",
  city: row.city || "",
  name: row.name || "",
  address: row.address || "",
  phone: row.phone || "",
  email: row.email || "",
  contactPerson: row.contact_person || "",
  note: row.note || "",
});

const toMenuRow = (menu: RestaurantMenu) => ({
  restaurant_id: menu.restaurantId,
  menu_name: menu.menuName,
  detail: menu.detail,
  note: menu.note,
});

const fromMenuRow = (row: any): RestaurantMenu => ({
  restaurantId: row.restaurant_id || "",
  menuName: row.menu_name || "",
  detail: row.detail || "",
  note: row.note || "",
});

const getMenuKey = (menu: RestaurantMenu) =>
  `${menu.restaurantId}::${menu.menuName}`;

export const appDatabase = {
  async getGuides() {
    if (!supabase) {
      return [...localDatabase.getGuides()].sort((a, b) =>
        compareRecordId(a.Id, b.Id),
      );
    }
    const { data, error } = await supabase
      .from("guides")
      .select("*")
      .order("id", { ascending: true });
    if (error) throw error;
    return (data || [])
      .map(fromGuideRow)
      .sort((a, b) => compareRecordId(a.Id, b.Id));
  },

  async saveGuides(guides: GuideData[]) {
    if (!supabase) {
      localDatabase.saveGuides(guides);
      return;
    }
    if (guides.length > 0) {
      const { error } = await supabase.from("guides").upsert(guides.map(toGuideRow));
      if (error) throw error;
    }

    const nextIds = new Set(guides.map((guide) => guide.Id));
    const { data: existingRows, error: selectError } = await supabase
      .from("guides")
      .select("id");
    if (selectError) throw selectError;

    const idsToDelete = (existingRows || [])
      .map((row) => row.id as string)
      .filter((id) => !nextIds.has(id));
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("guides")
        .delete()
        .in("id", idsToDelete);
      if (deleteError) throw deleteError;
    }
  },

  async upsertGuides(guides: GuideData[]) {
    if (!supabase) {
      const byId = new Map(localDatabase.getGuides().map((guide) => [guide.Id, guide]));
      guides.forEach((guide) => byId.set(guide.Id, guide));
      localDatabase.saveGuides(Array.from(byId.values()));
      return;
    }
    if (guides.length === 0) return;
    const { error } = await supabase.from("guides").upsert(guides.map(toGuideRow));
    if (error) throw error;
  },

  async upsertGuide(guide: GuideData) {
    await this.upsertGuides([guide]);
  },

  async deleteGuides(ids: string[]) {
    if (!supabase) {
      localDatabase.saveGuides(
        localDatabase.getGuides().filter((guide) => !ids.includes(guide.Id)),
      );
      return;
    }
    if (ids.length === 0) return;
    const { error } = await supabase.from("guides").delete().in("id", ids);
    if (error) throw error;
  },

  async getRestaurants() {
    if (!supabase) return localDatabase.getRestaurants();
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(fromRestaurantRow);
  },

  async saveRestaurants(restaurants: Restaurant[]) {
    if (!supabase) {
      localDatabase.saveRestaurants(restaurants);
      return;
    }
    if (restaurants.length > 0) {
      const { error } = await supabase
        .from("restaurants")
        .upsert(restaurants.map(toRestaurantRow));
      if (error) throw error;
    }

    const nextIds = new Set(restaurants.map((restaurant) => restaurant.id));
    const { data: existingRows, error: selectError } = await supabase
      .from("restaurants")
      .select("id");
    if (selectError) throw selectError;

    const idsToDelete = (existingRows || [])
      .map((row) => row.id as string)
      .filter((id) => !nextIds.has(id));
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("restaurants")
        .delete()
        .in("id", idsToDelete);
      if (deleteError) throw deleteError;
    }
  },

  async upsertRestaurants(restaurants: Restaurant[]) {
    if (!supabase) {
      const byId = new Map(
        localDatabase.getRestaurants().map((restaurant) => [
          restaurant.id,
          restaurant,
        ]),
      );
      restaurants.forEach((restaurant) => byId.set(restaurant.id, restaurant));
      localDatabase.saveRestaurants(Array.from(byId.values()));
      return;
    }
    if (restaurants.length === 0) return;
    const { error } = await supabase
      .from("restaurants")
      .upsert(restaurants.map(toRestaurantRow));
    if (error) throw error;
  },

  async upsertRestaurant(restaurant: Restaurant) {
    await this.upsertRestaurants([restaurant]);
  },

  async deleteRestaurantsWithMenus(ids: string[]) {
    if (!supabase) {
      localDatabase.saveRestaurantMenus(
        localDatabase
          .getRestaurantMenus()
          .filter((menu) => !ids.includes(menu.restaurantId)),
      );
      localDatabase.saveRestaurants(
        localDatabase
          .getRestaurants()
          .filter((restaurant) => !ids.includes(restaurant.id)),
      );
      return;
    }
    if (ids.length === 0) return;

    const { error: menuDeleteError } = await supabase
      .from("restaurant_menus")
      .delete()
      .in("restaurant_id", ids);
    if (menuDeleteError) throw menuDeleteError;

    const { error: restaurantDeleteError } = await supabase
      .from("restaurants")
      .delete()
      .in("id", ids);
    if (restaurantDeleteError) throw restaurantDeleteError;
  },

  async getRestaurantMenus() {
    if (!supabase) return localDatabase.getRestaurantMenus();
    const { data, error } = await supabase
      .from("restaurant_menus")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(fromMenuRow);
  },

  async saveRestaurantMenus(menus: RestaurantMenu[]) {
    if (!supabase) {
      localDatabase.saveRestaurantMenus(menus);
      return;
    }
    if (menus.length > 0) {
      const { error } = await supabase
        .from("restaurant_menus")
        .upsert(menus.map(toMenuRow));
      if (error) throw error;
    }

    const nextKeys = new Set(
      menus.map((menu) => `${menu.restaurantId}::${menu.menuName}`),
    );
    const { data: existingRows, error: selectError } = await supabase
      .from("restaurant_menus")
      .select("restaurant_id, menu_name");
    if (selectError) throw selectError;

    const rowsToDelete = (existingRows || []).filter(
      (row) => !nextKeys.has(`${row.restaurant_id}::${row.menu_name}`),
    );
    for (const row of rowsToDelete) {
      const { error: deleteError } = await supabase
        .from("restaurant_menus")
        .delete()
        .eq("restaurant_id", row.restaurant_id)
        .eq("menu_name", row.menu_name);
      if (deleteError) throw deleteError;
    }
  },

  async upsertRestaurantMenus(menus: RestaurantMenu[]) {
    if (!supabase) {
      const byKey = new Map(
        localDatabase
          .getRestaurantMenus()
          .map((menu) => [getMenuKey(menu), menu]),
      );
      menus.forEach((menu) => byKey.set(getMenuKey(menu), menu));
      localDatabase.saveRestaurantMenus(Array.from(byKey.values()));
      return;
    }
    if (menus.length === 0) return;
    const { error } = await supabase
      .from("restaurant_menus")
      .upsert(menus.map(toMenuRow));
    if (error) throw error;
  },

  async upsertRestaurantMenu(menu: RestaurantMenu) {
    await this.upsertRestaurantMenus([menu]);
  },

  async deleteRestaurantMenus(keys: Array<{ restaurantId: string; menuName: string }>) {
    if (!supabase) {
      const keySet = new Set(
        keys.map((key) => `${key.restaurantId}::${key.menuName}`),
      );
      localDatabase.saveRestaurantMenus(
        localDatabase
          .getRestaurantMenus()
          .filter((menu) => !keySet.has(getMenuKey(menu))),
      );
      return;
    }
    for (const key of keys) {
      const { error } = await supabase
        .from("restaurant_menus")
        .delete()
        .eq("restaurant_id", key.restaurantId)
        .eq("menu_name", key.menuName);
      if (error) throw error;
    }
  },
};
