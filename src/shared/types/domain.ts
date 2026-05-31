export interface ExtractedData {
  fullName?: string;
  lastName?: string;
  firstName?: string;
  idNumber?: string;
  dob?: string;
  address?: string;
  gender?: string;
  han_can_cuoc?: string;
  guideCardNumber?: string;
  guideCardExpire?: string;
  [key: string]: string | undefined;
}

export interface GuideData {
  Id: string;
  City: string;
  Name: string;
  Address: string;
  DoB: string;
  Sex: string;
  idNumber?: string;
  Expire: string;
  GuideID: string;
  GuideExpire: string;
  sdt: string;
  stk: string;
}

export interface Restaurant {
  id: string;
  city: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  contactPerson?: string;
  note?: string;
}

export interface RestaurantMenu {
  restaurantId: string;
  menuName: string;
  detail: string;
  note: string;
}

export interface MenuPlanDay {
  date: string;
  option: "lunch" | "dinner" | "both" | "na";
  lunchCity?: string;
  lunchRestaurantId?: string;
  lunchMenuName?: string;
  dinnerCity?: string;
  dinnerRestaurantId?: string;
  dinnerMenuName?: string;
}
