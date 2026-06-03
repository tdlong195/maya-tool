import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Download,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Users,
  Utensils,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { GuideEditorModal } from "../../shared/components";
import { localDatabase } from "../../shared/services";
import type {
  GuideData,
  Restaurant,
  RestaurantMenu,
} from "../../shared/types/domain";
import {
  BulkDeleteDialog,
  DatabaseErrorDialog,
  DatabaseTabButton,
  EditorModal,
  GuideTable,
  ImportConfirmModal,
  MenuDetailModal,
  MenuForm,
  MenuTable,
  Pagination,
  RestaurantForm,
  RestaurantTable,
  SingleDeleteDialog,
  SyncErrorDialog,
} from "./components";
import type { DbTab } from "./types";
import { exportCurrentTable } from "./helpers/exportCurrentTable";
import { getMenuKey } from "./helpers/records";
import { useDatabaseEditor } from "./hooks/useDatabaseEditor";
import { useDatabaseListing } from "./hooks/useDatabaseListing";
import { useDatabaseMutations } from "./hooks/useDatabaseMutations";
import { useDatabaseSelection } from "./hooks/useDatabaseSelection";
import { useGuideImageExtraction } from "./hooks/useGuideImageExtraction";

export function DatabaseFeature() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<DbTab>(() => {
    const requested = window.localStorage.getItem("hello-maya.database-tab");
    window.localStorage.removeItem("hello-maya.database-tab");
    return requested === "restaurants" || requested === "menus" || requested === "guides"
      ? requested
      : "guides";
  });
  const [guides, setGuides] = useState<GuideData[]>(() =>
    localDatabase.getGuides(),
  );
  const [restaurants, setRestaurants] = useState<Restaurant[]>(() =>
    localDatabase.getRestaurants(),
  );
  const [menus, setMenus] = useState<RestaurantMenu[]>(() =>
    localDatabase.getRestaurantMenus(),
  );
  const [selectedMenu, setSelectedMenu] = useState<RestaurantMenu | null>(null);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const currentCount =
    tab === "guides"
      ? guides.length
      : tab === "restaurants"
        ? restaurants.length
        : menus.length;

  const {
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
    resetFilters,
    resetPages,
    safeGuidePage,
    safeMenuPage,
    safeRestaurantPage,
    setCityFilter,
    setGuidePage,
    setMenuPage,
    setQuery,
    setRestaurantPage,
    updatePageSize,
  } = useDatabaseListing({ tab, guides, restaurants, menus });

  const {
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
  } = useDatabaseEditor({ guides, restaurants, setTab });

  const {
    selectedGuideIds,
    selectedRestaurantIds,
    selectedMenuKeys,
    currentSelectedIds,
    clearAllSelections,
    clearCurrentSelection,
    clearGuideSelection,
    clearRestaurantSelection,
    clearMenuSelection,
    toggleGuideSelected,
    toggleRestaurantSelected,
    toggleMenuSelected,
    toggleGuidePage,
    toggleRestaurantPage,
    toggleMenuPage,
    removeGuideSelection,
    removeRestaurantSelection,
    removeMenuSelection,
    removeMenusForRestaurantSelection,
    removeMenusForRestaurantsSelection,
  } = useDatabaseSelection(tab);

  const showNotice = (type: "success" | "error", message: string) => {
    setNotice({ type, message });
    window.setTimeout(() => setNotice(null), 3500);
  };

  const { extractingGuide, extractGuideFromImages } = useGuideImageExtraction({
    setGuideDraft,
    showNotice,
  });

  const {
    pendingImport,
    setPendingImport,
    syncError,
    setSyncError,
    databaseError,
    setDatabaseError,
    bulkDeleteRequest,
    setBulkDeleteRequest,
    singleDeleteRequest,
    setSingleDeleteRequest,
    isSyncing,
    syncDatabase,
    importWorkbook,
    applyPendingImport,
    saveGuideFromModal,
    saveRestaurant,
    saveMenu,
    requestRemoveGuide,
    requestRemoveRestaurant,
    requestRemoveMenu,
    confirmSingleDelete,
    removeSelectedRows,
    confirmBulkDelete,
  } = useDatabaseMutations({
    tab,
    guides,
    restaurants,
    menus,
    guideDraft,
    restaurantDraft,
    menuDraft,
    editingId,
    currentSelectedIds,
    setGuides,
    setRestaurants,
    setMenus,
    setIsEditorOpen,
    resetGuideDraft,
    resetRestaurantDraft,
    resetMenuDraft,
    clearAllSelections,
    clearGuideSelection,
    clearRestaurantSelection,
    clearMenuSelection,
    removeGuideSelection,
    removeRestaurantSelection,
    removeMenuSelection,
    removeMenusForRestaurantSelection,
    removeMenusForRestaurantsSelection,
    showNotice,
  });

  useEffect(() => {
    syncDatabase({ showAlert: false, showSuccess: false });
  }, []);

  useEffect(() => {
    if (!isEditorOpen && !selectedMenu) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isEditorOpen, selectedMenu]);

  return (
    <motion.div
      key="database-mode"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <Building2 size={15} />
              Database
            </div>
            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Danh sách dữ liệu
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Quản lý HDV và nhà hàng dùng lại trong các nghiệp vụ.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => syncDatabase()}
              disabled={isSyncing}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              <RefreshCw
                size={17}
                className={isSyncing ? "animate-spin" : ""}
              />
              {isSyncing ? "Đang sync..." : "Sync"}
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-3 text-sm font-bold text-white transition-colors hover:bg-slate-800"
            >
              <Plus size={17} /> Thêm mới
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-bold text-white transition-colors hover:bg-primary/90"
            >
              <Upload size={17} /> Import Excel
            </button>
            <button
              type="button"
              onClick={() =>
                exportCurrentTable({ tab, guides, restaurants, menus })
              }
              disabled={currentCount === 0}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              <Download size={17} /> Export
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) importWorkbook(file);
                event.currentTarget.value = "";
              }}
            />
          </div>
        </div>

        <div className="space-y-5 bg-slate-50/70 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
            <DatabaseTabButton
              active={tab === "guides"}
              icon={Users}
              label={`HDV (${guides.length})`}
              onClick={() => {
                setTab("guides");
                resetFilters();
                resetDraft();
              }}
            />
            <DatabaseTabButton
              active={tab === "restaurants"}
              icon={Building2}
              label={`Nhà hàng (${restaurants.length})`}
              onClick={() => {
                setTab("restaurants");
                resetFilters();
                resetDraft();
              }}
            />
            <DatabaseTabButton
              active={tab === "menus"}
              icon={Utensils}
              label={`Menu (${menus.length})`}
              onClick={() => {
                setTab("menus");
                resetFilters();
                resetDraft();
              }}
            />
            </div>

            <div className="flex flex-col md:flex-row gap-3 xl:min-w-[520px]">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    resetPages();
                  }}
                  placeholder={
                    tab === "guides"
                      ? "Tìm tên, ID, SĐT, thẻ HDV..."
                      : tab === "restaurants"
                        ? "Tìm tên, mã, SĐT, địa chỉ..."
                        : "Tìm nhà hàng, tên menu, nội dung..."
                  }
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-primary/10"
                />
              </div>
              <select
                value={cityFilter}
                onChange={(event) => {
                  setCityFilter(event.target.value);
                  resetPages();
                }}
                className="px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-primary/10"
              >
                <option value="">Tất cả thành phố</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {notice && (
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold ${
                notice.type === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {notice.type === "success" ? (
                <CheckCircle2 size={17} />
              ) : (
                <AlertCircle size={17} />
              )}
              {notice.message}
            </div>
          )}

          <div className="space-y-4 min-w-0">
              {currentSelectedIds.length > 0 && (
                <div className="flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-red-700 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-bold">
                    Đã chọn {currentSelectedIds.length} dòng
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={clearCurrentSelection}
                      className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Bỏ chọn
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        removeSelectedRows();
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
                    >
                      <Trash2 size={16} />
                      Xóa đã chọn
                    </button>
                  </div>
                </div>
              )}
              {tab === "guides" ? (
                <>
                  <GuideTable
                    guides={pagedGuides}
                    selectedIds={selectedGuideIds}
                    onToggleSelected={toggleGuideSelected}
                    onTogglePage={() =>
                      toggleGuidePage(pagedGuides.map((guide) => guide.Id))
                    }
                    onEdit={startEditGuide}
                    onRemove={requestRemoveGuide}
                  />
                  <Pagination
                    page={safeGuidePage}
                    pageCount={guidePageCount}
                    total={filteredGuides.length}
                    pageSize={pageSize}
                    onPageSizeChange={updatePageSize}
                    onPageChange={setGuidePage}
                  />
                </>
              ) : tab === "restaurants" ? (
                <>
                  <RestaurantTable
                    restaurants={pagedRestaurants}
                    selectedIds={selectedRestaurantIds}
                    onToggleSelected={toggleRestaurantSelected}
                    onTogglePage={() =>
                      toggleRestaurantPage(
                        pagedRestaurants.map((restaurant) => restaurant.id),
                      )
                    }
                    onEdit={startEditRestaurant}
                    onRemove={requestRemoveRestaurant}
                  />
                  <Pagination
                    page={safeRestaurantPage}
                    pageCount={restaurantPageCount}
                    total={filteredRestaurants.length}
                    pageSize={pageSize}
                    onPageSizeChange={updatePageSize}
                    onPageChange={setRestaurantPage}
                  />
                </>
              ) : (
                <>
                  <MenuTable
                    menus={pagedMenus}
                    restaurants={restaurants}
                    selectedKeys={selectedMenuKeys}
                    onToggleSelected={toggleMenuSelected}
                    onTogglePage={() => toggleMenuPage(pagedMenus.map(getMenuKey))}
                    onView={setSelectedMenu}
                    onEdit={startEditMenu}
                    onRemove={requestRemoveMenu}
                  />
                  <Pagination
                    page={safeMenuPage}
                    pageCount={menuPageCount}
                    total={filteredMenus.length}
                    pageSize={pageSize}
                    onPageSizeChange={updatePageSize}
                    onPageChange={setMenuPage}
                  />
                </>
              )}
          </div>
        </div>
      </div>

      {isEditorOpen && tab !== "guides" && (
        <EditorModal
          title={
            tab === "restaurants"
                ? editingId
                  ? "Sửa nhà hàng"
                  : "Thêm nhà hàng"
                : editingId
                  ? "Sửa menu"
                  : "Thêm menu"
          }
          onClose={closeEditor}
        >
          {tab === "restaurants" ? (
            <RestaurantForm
              draft={restaurantDraft}
              editing={Boolean(editingId)}
              onChange={setRestaurantDraft}
              onCancel={closeEditor}
              onSave={saveRestaurant}
            />
          ) : (
            <MenuForm
              draft={menuDraft}
              editing={Boolean(editingId)}
              restaurants={restaurants}
              onChange={setMenuDraft}
              onCancel={closeEditor}
              onSave={saveMenu}
            />
          )}
        </EditorModal>
      )}

      {isEditorOpen && tab === "guides" && (
        <GuideEditorModal
          title={editingId ? "Sửa HDV" : "Thêm HDV"}
          initialGuide={guideDraft}
          existingGuides={guides}
          saveLabel="Lưu"
          onClose={closeEditor}
          onSave={saveGuideFromModal}
        />
      )}

      {selectedMenu && (
        <MenuDetailModal
          menu={selectedMenu}
          restaurant={restaurants.find(
            (restaurant) => restaurant.id === selectedMenu.restaurantId,
          )}
          onClose={() => setSelectedMenu(null)}
          onEdit={() => {
            setSelectedMenu(null);
            startEditMenu(selectedMenu);
          }}
        />
      )}

      {pendingImport && (
        <ImportConfirmModal
          pendingImport={pendingImport}
          onClose={() => setPendingImport(null)}
          onReplace={() => applyPendingImport("replace")}
          onMerge={() => applyPendingImport("merge")}
        />
      )}

      {syncError && (
        <SyncErrorDialog
          message={syncError}
          onClose={() => setSyncError(null)}
          onRetry={() => {
            setSyncError(null);
            syncDatabase();
          }}
        />
      )}

      {databaseError && (
        <DatabaseErrorDialog
          title={databaseError.title}
          message={databaseError.message}
          onClose={() => setDatabaseError(null)}
        />
      )}

      {bulkDeleteRequest && (
        <BulkDeleteDialog
          count={bulkDeleteRequest.ids.length}
          label={
            bulkDeleteRequest.tab === "guides"
              ? "HDV"
              : bulkDeleteRequest.tab === "restaurants"
                ? "nhà hàng"
                : "menu"
          }
          onClose={() => setBulkDeleteRequest(null)}
          onConfirm={confirmBulkDelete}
        />
      )}

      {singleDeleteRequest && (
        <SingleDeleteDialog
          label={singleDeleteRequest.label}
          typeLabel={
            singleDeleteRequest.tab === "guides"
              ? "HDV"
              : singleDeleteRequest.tab === "restaurants"
                ? "nhà hàng"
                : "menu"
          }
          onClose={() => setSingleDeleteRequest(null)}
          onConfirm={confirmSingleDelete}
        />
      )}
    </motion.div>
  );
}
