import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number to at most 3 significant digits with K / M / B suffix. */
export function formatCount(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${parseFloat((value / 1_000_000_000).toPrecision(3))}B`;
  if (abs >= 1_000_000)     return `${parseFloat((value / 1_000_000).toPrecision(3))}M`;
  if (abs >= 1_000)         return `${parseFloat((value / 1_000).toPrecision(3))}K`;
  return `${Math.round(value)}`;
}

/** Format an IDR amount to at most 3 significant digits with K / M / B suffix. */
export function formatIDR(value: number): string {
  return `IDR ${formatCount(value)}`;
}
