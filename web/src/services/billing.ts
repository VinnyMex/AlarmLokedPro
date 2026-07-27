import { apiRequest } from './api';

export interface Subscription {
  id: string;
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED' | 'NONE';
  planCode?: string;
  priceMonthly?: string;
  trialEndAt?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}

export interface Charge {
  id: string;
  chargeType: 'SUBSCRIPTION' | 'CHALLENGE_SKIP';
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
}

export const subscriptionsApi = {
  status: () => apiRequest<Subscription>('/subscriptions/status'),
  // Demo mode: no real payment method is ever collected or charged — the
  // backend's ChargesService simulates a successful charge (see README).
  subscribe: () =>
    apiRequest<Subscription>('/subscriptions/subscribe', {
      method: 'POST',
      body: { provider: 'STRIPE', paymentMethodToken: 'demo-card-tok' },
    }),
  cancel: () => apiRequest<Subscription>('/subscriptions/cancel', { method: 'POST' }),
};

export const chargesApi = {
  list: () => apiRequest<Charge[]>('/charges'),
};
