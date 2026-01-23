import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatShortDate(date: Date | string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export const orderStatusLabels: Record<string, string> = {
  NEW: 'Yeni',
  PROCESSING: 'İşleniyor',
  PRODUCTION: 'Üretimde',
  READY: 'Hazır',
  SHIPPED: 'Kargoda',
  DELIVERED: 'Teslim Edildi',
  RETURNED: 'İade',
  CANCELLED: 'İptal',
  PROBLEM: 'Problem',
};

export const orderStatusColors: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-yellow-100 text-yellow-800',
  PRODUCTION: 'bg-purple-100 text-purple-800',
  READY: 'bg-green-100 text-green-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  RETURNED: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  PROBLEM: 'bg-red-100 text-red-800',
};

export const issueTypeLabels: Record<string, string> = {
  SHIPPING: 'Kargo',
  RETURN: 'İade',
  PRODUCT: 'Ürün',
  CUSTOMER: 'Müşteri',
  OTHER: 'Diğer',
};

export const priorityLabels: Record<number, string> = {
  1: 'Düşük',
  2: 'Normal',
  3: 'Yüksek',
  4: 'Acil',
};

export const priorityColors: Record<number, string> = {
  1: 'bg-gray-100 text-gray-800',
  2: 'bg-blue-100 text-blue-800',
  3: 'bg-orange-100 text-orange-800',
  4: 'bg-red-100 text-red-800',
};
