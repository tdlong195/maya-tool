import type {
  GuideData,
  Restaurant,
  RestaurantMenu,
} from "../../shared/types/domain";

export type DbTab = "guides" | "restaurants" | "menus";

export type PendingImport = {
  tab: DbTab;
  guides?: GuideData[];
  restaurants?: Restaurant[];
  menus?: RestaurantMenu[];
};

export type ExtractedGuide = {
  fullName?: string;
  gender?: string;
  idNumber?: string;
  dob?: string;
  address?: string;
  han_can_cuoc?: string;
  guideCardNumber?: string;
  guideCardExpire?: string;
};
