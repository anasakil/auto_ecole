'use client';
import React from 'react';
import Button from '../ui/Button';

function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  secondaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  size = 'md', // 'sm', 'md', 'lg'
  className = '',
}) {
  const sizes = {
    sm: {
      icon: 'w-12 h-12',
      title: 'text-base',
      description: 'text-sm',
      padding: 'py-6',
    },
    md: {
      icon: 'w-16 h-16',
      title: 'text-lg',
      description: 'text-sm',
      padding: 'py-12',
    },
    lg: {
      icon: 'w-20 h-20',
      title: 'text-xl',
      description: 'text-base',
      padding: 'py-16',
    },
  };

  const sizeConfig = sizes[size];

  const defaultIcon = (
    <svg
      className={`${sizeConfig.icon} text-gray-300`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );

  return (
    <div className={`flex flex-col items-center justify-center text-center ${sizeConfig.padding} ${className}`}>
      <div className="flex items-center justify-center mb-4">
        {icon || defaultIcon}
      </div>

      {title && (
        <h3 className={`font-semibold text-gray-900 mb-2 ${sizeConfig.title}`}>
          {title}
        </h3>
      )}

      {description && (
        <p className={`text-gray-500 max-w-md mb-6 ${sizeConfig.description}`}>
          {description}
        </p>
      )}

      {(action || onAction) && (
        <div className="flex items-center gap-3">
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="secondary" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
          <Button onClick={onAction}>
            {actionLabel || action || 'Ajouter'}
          </Button>
        </div>
      )}
    </div>
  );
}

// Preset empty states
EmptyState.NoData = ({ onAction, actionLabel = 'Ajouter' }) => (
  <EmptyState
    icon={
      <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    }
    title="Aucune donnée"
    description="Commencez par ajouter votre premier élément."
    onAction={onAction}
    actionLabel={actionLabel}
  />
);

EmptyState.NoResults = ({ onReset }) => (
  <EmptyState
    icon={
      <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    }
    title="Aucun résultat"
    description="Aucun élément ne correspond à votre recherche. Essayez de modifier vos critères."
    onAction={onReset}
    actionLabel="Réinitialiser la recherche"
  />
);

EmptyState.NoStudents = ({ onAction }) => (
  <EmptyState
    icon={
      <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    }
    title="Aucun élève"
    description="Vous n'avez pas encore d'élèves inscrits. Commencez par en ajouter un."
    onAction={onAction}
    actionLabel="Ajouter un élève"
  />
);

EmptyState.NoPayments = ({ onAction }) => (
  <EmptyState
    icon={
      <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    }
    title="Aucun paiement"
    description="Aucun paiement n'a été enregistré pour le moment."
    onAction={onAction}
    actionLabel="Ajouter un paiement"
  />
);

EmptyState.Error = ({ onRetry, message }) => (
  <EmptyState
    icon={
      <svg className="w-16 h-16 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    }
    title="Une erreur est survenue"
    description={message || "Impossible de charger les données. Veuillez réessayer."}
    onAction={onRetry}
    actionLabel="Réessayer"
  />
);

export default EmptyState;
