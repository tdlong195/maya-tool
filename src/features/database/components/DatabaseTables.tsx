import type {
  GuideData,
  Restaurant,
  RestaurantMenu,
} from "../../../shared/types/domain";
import { isExpired } from "../../../shared/utils";
import { getMenuKey } from "../helpers/records";
import { EmptyRow } from "./EmptyRow";
import { RowActions } from "./RowActions";

type GuideTableProps = {
  guides: GuideData[];
  selectedIds: string[];
  onToggleSelected: (id: string) => void;
  onTogglePage: () => void;
  onEdit: (guide: GuideData) => void;
  onRemove: (guide: GuideData) => void;
};

export function GuideTable({
  guides,
  selectedIds,
  onToggleSelected,
  onTogglePage,
  onEdit,
  onRemove,
}: GuideTableProps) {
  const allPageSelected =
    guides.length > 0 && guides.every((guide) => selectedIds.includes(guide.Id));

  return (
    <div className="w-full max-w-full overflow-x-auto border border-slate-100 rounded-3xl bg-white">
      <table className="w-full text-left min-w-[800px]">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3 w-12">
              <input
                type="checkbox"
                checked={allPageSelected}
                disabled={guides.length === 0}
                onChange={onTogglePage}
                className="h-4 w-4 rounded border-slate-300 text-primary"
                aria-label="Chọn tất cả HDV trên trang"
              />
            </th>
            <th className="px-4 py-3">ID</th>
            <th className="px-4 py-3">Tên</th>
            <th className="px-4 py-3">Thành phố</th>
            <th className="px-4 py-3">SĐT</th>
            <th className="px-4 py-3">CCCD / Hạn</th>
            <th className="px-4 py-3">Thẻ HDV / Hạn</th>
            <th className="px-4 py-3">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {guides.map((guide) => {
            const expired =
              isExpired(guide.Expire) || isExpired(guide.GuideExpire);
            return (
              <tr key={guide.Id} className={expired ? "bg-red-50/70" : ""}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(guide.Id)}
                    onChange={() => onToggleSelected(guide.Id)}
                    className="h-4 w-4 rounded border-slate-300 text-primary"
                    aria-label={`Chọn ${guide.Name}`}
                  />
                </td>
                <td className="px-4 py-3 text-sm font-mono text-slate-500">
                  {guide.Id}
                </td>
                <td className="px-4 py-3 text-sm font-bold min-w-40">
                  {guide.Name}
                </td>
                <td className="px-4 py-3 text-sm">{guide.City}</td>
                <td className="px-4 py-3 text-sm">{guide.sdt}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="font-mono">{guide.idNumber}</div>
                  <div
                    className={
                      isExpired(guide.Expire)
                        ? "text-xs text-red-600 font-bold"
                        : "text-xs text-slate-400"
                    }
                  >
                    {guide.Expire}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="font-mono">{guide.GuideID}</div>
                  <div
                    className={
                      isExpired(guide.GuideExpire)
                        ? "text-xs text-red-600 font-bold"
                        : "text-xs text-slate-400"
                    }
                  >
                    {guide.GuideExpire}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    onEdit={() => onEdit(guide)}
                    onRemove={() => onRemove(guide)}
                  />
                </td>
              </tr>
            );
          })}
          {guides.length === 0 && <EmptyRow colSpan={8} />}
        </tbody>
      </table>
    </div>
  );
}

type RestaurantTableProps = {
  restaurants: Restaurant[];
  selectedIds: string[];
  onToggleSelected: (id: string) => void;
  onTogglePage: () => void;
  onEdit: (restaurant: Restaurant) => void;
  onRemove: (restaurant: Restaurant) => void;
};

export function RestaurantTable({
  restaurants,
  selectedIds,
  onToggleSelected,
  onTogglePage,
  onEdit,
  onRemove,
}: RestaurantTableProps) {
  const allPageSelected =
    restaurants.length > 0 &&
    restaurants.every((restaurant) => selectedIds.includes(restaurant.id));

  return (
    <div className="w-full max-w-full overflow-x-auto border border-slate-100 rounded-3xl bg-white">
      <table className="w-full text-left min-w-[760px]">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3 w-12">
              <input
                type="checkbox"
                checked={allPageSelected}
                disabled={restaurants.length === 0}
                onChange={onTogglePage}
                className="h-4 w-4 rounded border-slate-300 text-primary"
                aria-label="Chọn tất cả nhà hàng trên trang"
              />
            </th>
            <th className="px-4 py-3">Mã</th>
            <th className="px-4 py-3">Tên nhà hàng</th>
            <th className="px-4 py-3">Thành phố</th>
            <th className="px-4 py-3">Liên hệ</th>
            <th className="px-4 py-3">Địa chỉ</th>
            <th className="px-4 py-3">Ghi chú</th>
            <th className="px-4 py-3">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {restaurants.map((restaurant) => (
            <tr key={restaurant.id}>
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(restaurant.id)}
                  onChange={() => onToggleSelected(restaurant.id)}
                  className="h-4 w-4 rounded border-slate-300 text-primary"
                  aria-label={`Chọn ${restaurant.name}`}
                />
              </td>
              <td className="px-4 py-3 text-sm font-mono text-slate-500">
                {restaurant.id}
              </td>
              <td className="px-4 py-3 text-sm font-bold">{restaurant.name}</td>
              <td className="px-4 py-3 text-sm">{restaurant.city}</td>
              <td className="px-4 py-3 text-sm">
                <div>{restaurant.contactPerson}</div>
                <div className="text-slate-500">{restaurant.phone}</div>
                <div className="text-slate-400">{restaurant.email}</div>
              </td>
              <td className="px-4 py-3 text-sm max-w-[220px]">
                {restaurant.address}
              </td>
              <td className="px-4 py-3 text-sm max-w-[180px]">
                {restaurant.note}
              </td>
              <td className="px-4 py-3">
                <RowActions
                  onEdit={() => onEdit(restaurant)}
                  onRemove={() => onRemove(restaurant)}
                />
              </td>
            </tr>
          ))}
          {restaurants.length === 0 && <EmptyRow colSpan={8} />}
        </tbody>
      </table>
    </div>
  );
}

type MenuTableProps = {
  menus: RestaurantMenu[];
  restaurants: Restaurant[];
  selectedKeys: string[];
  onToggleSelected: (key: string) => void;
  onTogglePage: () => void;
  onView: (menu: RestaurantMenu) => void;
  onEdit: (menu: RestaurantMenu) => void;
  onRemove: (menu: RestaurantMenu) => void;
};

export function MenuTable({
  menus,
  restaurants,
  selectedKeys,
  onToggleSelected,
  onTogglePage,
  onView,
  onEdit,
  onRemove,
}: MenuTableProps) {
  const restaurantById = new Map(
    restaurants.map((restaurant) => [restaurant.id, restaurant]),
  );
  const allPageSelected =
    menus.length > 0 &&
    menus.every((menu) => selectedKeys.includes(getMenuKey(menu)));

  return (
    <div className="w-full max-w-full overflow-x-auto border border-slate-100 rounded-3xl bg-white">
      <table className="w-full text-left min-w-[800px]">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3 w-12">
              <input
                type="checkbox"
                checked={allPageSelected}
                disabled={menus.length === 0}
                onChange={onTogglePage}
                className="h-4 w-4 rounded border-slate-300 text-primary"
                aria-label="Chọn tất cả menu trên trang"
              />
            </th>
            <th className="px-4 py-3">Nhà hàng</th>
            <th className="px-4 py-3">Menu</th>
            <th className="px-4 py-3">Nội dung</th>
            <th className="px-4 py-3">Ghi chú</th>
            <th className="px-4 py-3">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {menus.map((menu) => {
            const restaurant = restaurantById.get(menu.restaurantId);
            const key = getMenuKey(menu);
            return (
              <tr
                key={key}
                tabIndex={0}
                onClick={() => onView(menu)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onView(menu);
                  }
                }}
                className="cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedKeys.includes(key)}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() => onToggleSelected(key)}
                    className="h-4 w-4 rounded border-slate-300 text-primary"
                    aria-label={`Chọn ${menu.menuName}`}
                  />
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="font-bold text-slate-800">
                    {restaurant?.name || "Không tìm thấy nhà hàng"}
                  </div>
                  <div className="font-mono text-xs text-slate-400">
                    {menu.restaurantId}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-bold min-w-44">
                  {menu.menuName}
                </td>
                <td className="px-4 py-3 text-sm max-w-[360px]">
                  <div className="line-clamp-3 whitespace-pre-line text-slate-600">
                    {menu.detail}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm max-w-[220px]">
                  {menu.note}
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    onEdit={() => onEdit(menu)}
                    onRemove={() => onRemove(menu)}
                  />
                </td>
              </tr>
            );
          })}
          {menus.length === 0 && <EmptyRow colSpan={6} />}
        </tbody>
      </table>
    </div>
  );
}
