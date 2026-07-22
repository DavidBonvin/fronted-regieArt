import React from 'react';

export type CardVariant = 'elevated' | 'outlined' | 'flat';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Card({
  children,
  variant = 'elevated',
  interactive = false,
  onClick,
  className = '',
}: CardProps) {
  return (
    <div
      data-variant={variant}
      data-interactive={interactive}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={`ra-card ${className}`}
    >
      {children}
    </div>
  );
}
