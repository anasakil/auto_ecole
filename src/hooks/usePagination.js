import { useState, useMemo, useEffect } from 'react';

export function usePagination(data = [], pageSize = 20) {
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever the filtered data reference changes
  useEffect(() => {
    setPage(1);
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, safePage, pageSize]);

  return { page: safePage, setPage, totalPages, paginatedData, total: data.length, pageSize };
}
