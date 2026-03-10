'use client';
import { useState, useCallback } from 'react';

export function useConfirm() {
  const [state, setState] = useState({
    isOpen: false,
    title: 'Confirmer',
    message: 'Êtes-vous sûr de vouloir continuer ?',
    type: 'default',
    confirmText: 'Confirmer',
    cancelText: 'Annuler',
    loading: false,
    onConfirm: null,
    onCancel: null,
  });

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        title: options.title || 'Confirmer',
        message: options.message || 'Êtes-vous sûr de vouloir continuer ?',
        type: options.type || 'default',
        confirmText: options.confirmText || 'Confirmer',
        cancelText: options.cancelText || 'Annuler',
        loading: false,
        onConfirm: () => {
          setState((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setState((prev) => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  }, []);

  const confirmDelete = useCallback((itemName) => {
    return confirm({
      title: 'Supprimer',
      message: `Êtes-vous sûr de vouloir supprimer ${itemName ? `"${itemName}"` : 'cet élément'} ? Cette action est irréversible.`,
      type: 'danger',
      confirmText: 'Supprimer',
    });
  }, [confirm]);

  const confirmAction = useCallback((message) => {
    return confirm({
      title: 'Confirmation',
      message,
      type: 'warning',
    });
  }, [confirm]);

  const setLoading = useCallback((loading) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const dialogProps = {
    isOpen: state.isOpen,
    title: state.title,
    message: state.message,
    type: state.type,
    confirmText: state.confirmText,
    cancelText: state.cancelText,
    loading: state.loading,
    onConfirm: state.onConfirm,
    onClose: state.onCancel,
  };

  return {
    confirm,
    confirmDelete,
    confirmAction,
    setLoading,
    close,
    dialogProps,
    isConfirming: state.isOpen,
  };
}

export default useConfirm;
