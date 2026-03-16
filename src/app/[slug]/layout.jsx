'use client';
import { useParams } from 'next/navigation';
import { TenantProvider } from '@/contexts/TenantContext';
import Sidebar from '@/components/Sidebar';

export default function TenantLayout({ children }) {
  const { slug } = useParams();

  return (
    <TenantProvider slug={slug}>
      <div className="flex h-screen overflow-hidden bg-surface-100">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </TenantProvider>
  );
}
