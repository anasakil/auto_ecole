'use client';
import React from 'react';
import Button from '../ui/Button';

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmer',
  message = 'Êtes-vous sûr de vouloir continuer ?',
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'default',
  loading = false,
  icon,
}) {
  if (!isOpen) return null;

  const typeStyles = {
    default: { iconBg: 'bg-primary-100', iconColor: 'text-primary-600', confirmVariant: 'primary' },
    danger: { iconBg: 'bg-red-100', iconColor: 'text-red-600', confirmVariant: 'danger' },
    warning: { iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600', confirmVariant: 'warning' },
  };

  const style = typeStyles[type];

  const defaultIcons = {
    default: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
    danger: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>),
    warning: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>),
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-scaleIn" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-full ${style.iconBg} ${style.iconColor} flex items-center justify-center`}>
              {icon || defaultIcons[type]}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
              <p className="text-sm text-gray-600">{message}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={onClose} disabled={loading}>{cancelText}</Button>
            <Button variant={style.confirmVariant} onClick={onConfirm} loading={loading}>{confirmText}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
