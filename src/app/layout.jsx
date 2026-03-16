'use client';
import './globals.css';
import { ToastProvider } from '@/contexts/ToastContext';
import { ConfirmProvider } from '@/contexts/ConfirmContext';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({ children }) {
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
              {children}
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
