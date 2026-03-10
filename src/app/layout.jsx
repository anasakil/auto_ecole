'use client';
import './globals.css';
import { usePathname } from 'next/navigation';
import { ToastProvider } from '@/contexts/ToastContext';
import { ConfirmProvider } from '@/contexts/ConfirmContext';
import { AuthProvider } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <html lang="fr">
      <head>
        <title>Auto-École Maroc</title>
        <meta name="description" content="Application de gestion d'auto-école au Maroc" />
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              {isLoginPage ? (
                children
              ) : (
                <div className="flex h-screen overflow-hidden">
                  <Sidebar />
                  <main className="flex-1 overflow-auto bg-gray-50">
                    <div className="p-6">
                      {children}
                    </div>
                  </main>
                </div>
              )}
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
