import { useState, useMemo, useRef, useEffect } from 'react';

export function usePagination(data = [], pageSize = 20) {
  const [page, setPage] = useState(1);

  // Track previous data length + first item id to detect filter changes
  // We can't use data reference (new array every render) but we can use
  // a stable fingerprint: length + first item key
  const prevFingerprintRef = useRef(null);

  const fingerprint = data.length > 0
    ? `${data.length}-${data[0]?.id ?? data[0]?.invoice_number ?? JSON.stringify(data[0]).slice(0, 40)}`
    : 'empty';

  useEffect(() => {
    if (prevFingerprintRef.current !== null && prevFingerprintRef.current !== fingerprint) {
      setPage(1);
    }
    prevFingerprintRef.current = fingerprint;
  }, [fingerprint]);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, safePage, pageSize]);

  return { page: safePage, setPage, totalPages, paginatedData, total: data.length, pageSize };
}
