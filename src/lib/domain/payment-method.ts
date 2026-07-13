import type { PaymentMethod } from '@/lib/local-db/monsterly-db';

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  card: 'Tarjeta (POS)',
  cash: 'Efectivo',
  transfer: 'Transferencia',
};
