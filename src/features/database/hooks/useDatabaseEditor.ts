import { useState } from "react";
import type {
  GuideData,
  Restaurant,
  RestaurantMenu,
} from "../../../shared/types/domain";
import { emptyGuide, emptyMenu, emptyRestaurant } from "../helpers/defaultRecords";
import { getMenuKey, nextCode } from "../helpers/records";
import type { DbTab } from "../types";

type UseDatabaseEditorParams = {
  guides: GuideData[];
  restaurants: Restaurant[];
  setTab: (tab: DbTab) => void;
};

export function useDatabaseEditor({
  guides,
  restaurants,
  setTab,
}: UseDatabaseEditorParams) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [guideDraft, setGuideDraft] = useState<GuideData>(() => ({
    ...emptyGuide,
    Id: nextCode("HDV", guides.map((guide) => guide.Id)),
  }));
  const [restaurantDraft, setRestaurantDraft] = useState<Restaurant>(() => ({
    ...emptyRestaurant,
    id: nextCode("NH", restaurants.map((restaurant) => restaurant.id)),
  }));
  const [menuDraft, setMenuDraft] = useState<RestaurantMenu>(emptyMenu);

  const resetGuideDraft = (next = guides) => {
    setEditingId(null);
    setGuideDraft({ ...emptyGuide, Id: nextCode("HDV", next.map((g) => g.Id)) });
  };

  const resetRestaurantDraft = (next = restaurants) => {
    setEditingId(null);
    setRestaurantDraft({
      ...emptyRestaurant,
      id: nextCode("NH", next.map((restaurant) => restaurant.id)),
    });
  };

  const resetMenuDraft = () => {
    setEditingId(null);
    setMenuDraft(emptyMenu);
  };

  const resetDraft = () => {
    resetGuideDraft();
    resetRestaurantDraft();
    resetMenuDraft();
  };

  const openCreateModal = () => {
    resetDraft();
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    resetDraft();
  };

  const startEditGuide = (guide: GuideData) => {
    setTab("guides");
    setEditingId(guide.Id);
    setGuideDraft(guide);
    setIsEditorOpen(true);
  };

  const startEditRestaurant = (restaurant: Restaurant) => {
    setTab("restaurants");
    setEditingId(restaurant.id);
    setRestaurantDraft(restaurant);
    setIsEditorOpen(true);
  };

  const startEditMenu = (menu: RestaurantMenu) => {
    setTab("menus");
    setEditingId(getMenuKey(menu));
    setMenuDraft(menu);
    setIsEditorOpen(true);
  };

  return {
    editingId,
    isEditorOpen,
    guideDraft,
    restaurantDraft,
    menuDraft,
    setIsEditorOpen,
    setGuideDraft,
    setRestaurantDraft,
    setMenuDraft,
    resetGuideDraft,
    resetRestaurantDraft,
    resetMenuDraft,
    resetDraft,
    openCreateModal,
    closeEditor,
    startEditGuide,
    startEditRestaurant,
    startEditMenu,
  };
}
