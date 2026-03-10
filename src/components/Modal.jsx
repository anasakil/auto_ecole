'use client';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'lg',
  icon,
  iconColor = 'primary',
  footer,
  closeOnBackdrop = true,
  closeOnOverlay = true,
  closeOnEscape = true,
  showCloseButton = true,
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Support both closeOnBackdrop and closeOnOverlay props
  const shouldCloseOnBackdrop = closeOnBackdrop && closeOnOverlay;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      setShouldRender(true);
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
      document.body.style.overflow = 'hidden';
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        document.body.style.overflow = '';
        if (previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const handleTab = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleTab);
    firstElement?.focus();
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen, shouldRender]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && shouldCloseOnBackdrop) {
      onClose();
    }
  };

  const sizeClasses = {
    xs: 'max-w-sm',
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-7xl',
  };

  const iconColors = {
    primary: 'bg-primary-100 text-primary-600',
    success: 'bg-green-100 text-green-600',
    warning: 'bg-yellow-100 text-yellow-600',
    danger: 'bg-red-100 text-red-600',
    info: 'bg-blue-100 text-blue-600',
  };

  if (!shouldRender || !mounted) return null;

  const modalContent = (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-200 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-gray-900 backdrop-blur-sm transition-opacity duration-200 ${
          isAnimating ? 'opacity-60' : 'opacity-0'
        }`}
      />

      {/* Modal Container */}
      <div
        ref={modalRef}
        className={`relative w-full ${sizeClasses[size]} bg-white rounded-2xl shadow-2xl transform transition-all duration-200 ${
          isAnimating
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              aria-label="Fermer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          <div className="flex items-start gap-4 pr-10">
            {icon && (
              <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${iconColors[iconColor]}`}>
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 id="modal-title" className="text-xl font-semibold text-gray-900 leading-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

        {/* Body */}
        <div className="px-6 py-5 max-h-[calc(100vh-16rem)] overflow-y-auto custom-scrollbar">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <>
            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
            <div className="px-6 py-4 bg-gray-50 rounded-b-2xl">
              {footer}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

Modal.Footer = function ModalFooter({ children, className = '' }) {
  return (
    <div className={`flex items-center justify-end gap-3 ${className}`}>
      {children}
    </div>
  );
};

Modal.Section = function ModalSection({ title, children, className = '' }) {
  return (
    <div className={`mb-6 last:mb-0 ${className}`}>
      {title && (
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};

export default Modal;
