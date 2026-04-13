import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  lightBg?: boolean;
}

export function PageLayout({ children, lightBg = true }: PageLayoutProps) {
  return (
    <div className={`flex-1 pt-16 ${lightBg ? 'bg-white' : 'bg-[#F9FAFB]'}`}>
      {children}
    </div>
  );
}
