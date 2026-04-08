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
 * 2. Compact: If isCompact is true and amount >= 10,000, use notation like 10.5K.
 */
export function formatCurrency(amount: number, symbol: string = '', isCompact: boolean = false) {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  // Compact notation for large numbers in specific UI elements (Cards, Charts)
  if (isCompact && absAmount >= 10000) {
    return sign + symbol + Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(absAmount);
  }

  // Standard precision format
  const formatted = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return sign + symbol + formatted;
}
