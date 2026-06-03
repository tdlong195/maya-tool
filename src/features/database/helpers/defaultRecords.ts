import type {
  GuideData,
  Restaurant,
  RestaurantMenu,
} from "../../../shared/types/domain";

export const emptyGuide: GuideData = {
  Id: "",
  City: "",
  Name: "",
  Address: "",
  DoB: "",
  Sex: "",
  idNumber: "",
  Expire: "",
  GuideID: "",
  GuideExpire: "",
  sdt: "",
  stk: "",
};

export const emptyRestaurant: Restaurant = {
  id: "",
  city: "",
  name: "",
  address: "",
  phone: "",
  email: "",
  contactPerson: "",
  note: "",
};

export const emptyMenu: RestaurantMenu = {
  restaurantId: "",
  menuName: "",
  detail: "",
  note: "",
};
