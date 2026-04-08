import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Global currency formatter for FynWealth.
 * Ensures consistent display of amounts across the app.
 * 
 * Rules:
 * 1. Default: 3,200.00 (two decimals).
 * 2. Compact: If isCompact is true AND amount >= 100,000 (6 digits), use notation like 150K.
 */
export function formatCurrency(amount: number, symbol: string = '', isCompact: boolean = false) {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  // Compact notation only for values equal to or more than 6 digits (>= 100,000)
  if (isCompact && absAmount >= 100000) {
    return sign + symbol + Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(absAmount);
  }

  // Standard precision format: 3,200.00
  const formatted = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return sign + symbol + formatted;
}
