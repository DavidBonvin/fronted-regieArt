import React from 'react';

export type TypographyVariant =
  | 'h1' | 'h2' | 'h3' | 'h4'
  | 'body1' | 'body2'
  | 'caption' | 'overline' | 'label';

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
type TextTag = 'p' | 'span' | 'div' | 'small';

const tagMap: Record<TypographyVariant, HeadingTag | TextTag> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  body1: 'p',
  body2: 'p',
  caption: 'small',
  overline: 'span',
  label: 'span',
};

export interface TypographyProps {
  variant?: TypographyVariant;
  children: React.ReactNode;
  className?: string;
  truncate?: boolean;
}

export function Typography({
  variant = 'body1',
  children,
  className = '',
  truncate = false,
}: TypographyProps) {
  const Tag = tagMap[variant];
  return (
    <Tag
      data-variant={variant}
      data-truncate={truncate}
      className={`ra-typography ${className}`}
    >
      {children}
    </Tag>
  );
}
