'use client';
import React from 'react';

function Card({
  children,
  title,
  subtitle,
  icon,
  actions,
  footer,
  padding = 'md',
  hover = false,
  border = false,
  borderColor = 'gray',
  className = '',
}) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const borderClasses = {
    gray: 'border-l-4 border-gray-400',
    primary: 'border-l-4 border-primary-500',
    success: 'border-l-4 border-green-500',
    warning: 'border-l-4 border-yellow-500',
    danger: 'border-l-4 border-red-500',
    info: 'border-l-4 border-blue-500',
  };

  return (
    <div
      className={`
        bg-white rounded-lg shadow-sm
        ${paddingClasses[padding]}
        ${hover ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}
        ${border ? borderClasses[borderColor] : ''}
        ${className}
      `}
    >
      {(title || actions) && (
        <div className={`flex items-center justify-between ${padding !== 'none' ? 'mb-4' : 'p-4 border-b'}`}>
          <div className="flex items-center">
            {icon && <span className="mr-3 text-gray-500">{icon}</span>}
            <div>
              {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      <div>{children}</div>

      {footer && (
        <div className={`${padding !== 'none' ? 'mt-4 pt-4' : 'p-4'} border-t border-gray-100`}>
          {footer}
        </div>
      )}
    </div>
  );
}

function CardHeader({ children, className = '' }) {
  return (
    <div className={`pb-4 border-b border-gray-100 mb-4 ${className}`}>
      {children}
    </div>
  );
}

function CardBody({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

function CardFooter({ children, className = '' }) {
  return (
    <div className={`pt-4 border-t border-gray-100 mt-4 ${className}`}>
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
