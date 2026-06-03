const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

type PaginationProps = {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  onPageChange: (page: number) => void;
};

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageSizeChange,
  onPageChange,
}: PaginationProps) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pages = getVisiblePages(page, pageCount);

  return (
    <div className="flex flex-col gap-3 px-1 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center">
        <div>
          Hiển thị {start}-{end} / {total} dòng
        </div>
        <label className="inline-flex items-center gap-2">
          <span>Số dòng/trang</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 outline-none focus:ring-4 focus:ring-primary/10"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 disabled:opacity-40"
        >
          Trước
        </button>
        {pages.map((pageNumber, index) =>
          pageNumber === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="px-2 py-2 text-sm font-bold text-slate-400"
            >
              ...
            </span>
          ) : (
            <button
              key={pageNumber}
              onClick={() => onPageChange(pageNumber)}
              className={`min-w-10 px-3 py-2 rounded-xl text-sm font-bold ${
                pageNumber === page
                  ? "bg-primary text-white"
                  : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              {pageNumber}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page >= pageCount}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 disabled:opacity-40"
        >
          Sau
        </button>
      </div>
    </div>
  );
}

function getVisiblePages(
  currentPage: number,
  pageCount: number,
): Array<number | "ellipsis"> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, pageCount - 1, pageCount]);

  if (currentPage <= 4) {
    [2, 3, 4, 5].forEach((page) => pages.add(page));
  } else if (currentPage >= pageCount - 3) {
    [pageCount - 4, pageCount - 3, pageCount - 2].forEach((page) =>
      pages.add(page),
    );
  } else {
    [currentPage - 1, currentPage, currentPage + 1].forEach((page) =>
      pages.add(page),
    );
  }

  const sortedPages = Array.from(pages)
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);

  return sortedPages.flatMap((page, index) => {
    const previous = sortedPages[index - 1];
    if (previous && page - previous > 1) {
      return ["ellipsis" as const, page];
    }
    return [page];
  });
}
