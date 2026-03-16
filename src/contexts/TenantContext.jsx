'use client';
import React, { createContext, useContext, useEffect } from 'react';
import { setTenantSlug } from '@/utils/api';

const TenantContext = createContext(null);

export function TenantProvider({ slug, children }) {
  // Set slug synchronously so it's available before children's useEffect
  setTenantSlug(slug);

  useEffect(() => {
    return () => setTenantSlug(null);
  }, [slug]);

  return (
    <TenantContext.Provider value={{ slug }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) throw new Error('useTenant must be used within TenantProvider');
  return context;
}

export function useTenantPath(path) {
  const { slug } = useTenant();
  return `/${slug}${path}`;
}
