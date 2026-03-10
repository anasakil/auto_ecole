import { useState, useMemo } from 'react';

export function usePagination(data = [], pageSize = 10) {
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(data.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  return { page, setPage, totalPages, paginatedData, total: data.length, pageSize };
}
