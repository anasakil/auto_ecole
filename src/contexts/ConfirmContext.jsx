'use client';
import React, { createContext, useContext } from 'react';
import { useConfirm } from '../hooks/useConfirm';
import ConfirmDialog from '../components/feedback/ConfirmDialog';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const confirmHook = useConfirm();

  return (
    <ConfirmContext.Provider value={confirmHook}>
      {children}
      <ConfirmDialog {...confirmHook.dialogProps} />
    </ConfirmContext.Provider>
  );
}

export function useConfirmDialog() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirmDialog must be used within a ConfirmProvider');
  }
  return context;
}

export default ConfirmContext;
