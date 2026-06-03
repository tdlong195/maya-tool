import type { RestaurantMenu } from "../../../shared/types/domain";

export const nextCode = (prefix: string, ids: string[]) => {
  const max = ids.reduce((value, id) => {
    const match = id.match(new RegExp(`^${prefix}[-_ ]?(\\d+)$`, "i"));
    return match ? Math.max(value, Number(match[1])) : value;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
};

export const compareRecordId = (left: string, right: string) => {
  const leftMatch = left.match(/^([^\d]*)(\d+)$/);
  const rightMatch = right.match(/^([^\d]*)(\d+)$/);

  if (leftMatch && rightMatch && leftMatch[1] === rightMatch[1]) {
    return Number(leftMatch[2]) - Number(rightMatch[2]);
  }

  return left.localeCompare(right, undefined, { numeric: true });
};

export const getMenuKey = (menu: RestaurantMenu) =>
  `${menu.restaurantId}::${menu.menuName}`;

export const parseMenuKey = (key: string) => {
  const [restaurantId, ...menuNameParts] = key.split("::");
  return {
    restaurantId,
    menuName: menuNameParts.join("::"),
  };
};
