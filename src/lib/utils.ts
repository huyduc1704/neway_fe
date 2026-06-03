import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (v: number | string) =>
  new Intl.NumberFormat('vi-VN').format(Number(v)) + 'đ';

export const formatDate = (d: string | Date) =>
  new Intl.DateTimeFormat('vi-VN').format(new Date(d));
