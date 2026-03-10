import React from 'react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center", className)}>
      <span className="text-2xl font-bold font-headline text-primary tracking-tight transition-colors">
        FynWealth
      </span>
    </div>
  );
}
