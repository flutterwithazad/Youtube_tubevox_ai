import React from 'react';
import { useInView } from '@/hooks/use-in-view';
import { cn } from '@/lib/utils';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: 0 | 100 | 200 | 300 | 400 | 500;
  type?: 'fade-up' | 'scale';
  threshold?: number;
}

export function Reveal({ children, className, delay = 0, type = 'fade-up', threshold = 0.1 }: RevealProps) {
  const { ref, inView } = useInView(threshold);
  
  const baseClass = type === 'fade-up' ? 'reveal-hidden' : 'reveal-hidden-scale';
  const visibleClass = type === 'fade-up' ? 'reveal-visible' : 'reveal-visible-scale';
  const delayClass = delay > 0 ? `delay-${delay}` : '';

  return (
    <div
      ref={ref}
      className={cn(
        baseClass,
        inView && visibleClass,
        delayClass,
        className
      )}
    >
      {children}
    </div>
  );
}
