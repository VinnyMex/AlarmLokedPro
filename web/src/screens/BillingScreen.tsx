import React, { useCallback, useEffect, useState } from 'react';
import { colors, spacing } from '@/theme/colors';
import { subscriptionsApi, chargesApi, Subscription, Charge } from '@/services/billing';

const STATUS_LABEL: Record<Subscription['status'], string> = {
  NONE: 'No subscription yet',
  TRIALING: 'Trial active',
  ACTIVE: 'Active',
  PAST_DUE: 'Past due',
  CANCELED: 'Canceled (active until period end)',
  EXPIRED: 'Expired',
};

export default function BillingScreen() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [status, chargeList] = await Promise.all([subscriptionsApi.status(), chargesApi.list()]);
    setSubscription(status);
    setCharges(chargeList);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load billing info'));
  }, [load]);

  const handleSubscribe = async () => {
    setBusy(true);
    setError(null);
    try {
      await subscriptionsApi.subscribe();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start subscription');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    setBusy(true);
    setError(null);
    try {
      await subscriptionsApi.cancel();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setBusy(false);
    }
  };

  const status = subscription?.status ?? 'NONE';
  const canSubscribe = status === 'NONE' || status === 'CANCELED' || status === 'EXPIRED';
  const canCancel = (status === 'TRIALING' || status === 'ACTIVE') && !subscription?.cancelAtPeriodEnd;

  return (
    <div style={{ padding: spacing.md }}>
      <div
        style={{
          background: colors.surfaceAlt,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          padding: spacing.md,
          marginBottom: spacing.md,
          color: colors.textSecondary,
          fontSize: 13,
        }}
      >
        Demo mode: no real card is collected or charged. Subscribing and skipping just create
        simulated ledger entries so you can test the trial and billing flow end to end.
      </div>

      <div style={{ background: colors.surface, borderRadius: 16, padding: spacing.md, border: `1px solid ${colors.border}` }}>
        <div style={{ color: colors.textSecondary, fontSize: 12 }}>Subscription</div>
        <div style={{ color: colors.textPrimary, fontSize: 20, fontWeight: 700, margin: `${spacing.xs}px 0` }}>
          {STATUS_LABEL[status]}
        </div>
        {subscription?.trialEndAt && status === 'TRIALING' && (
          <div style={{ color: colors.textSecondary, fontSize: 13 }}>
            Trial ends {new Date(subscription.trialEndAt).toLocaleDateString()}
          </div>
        )}
        {subscription?.currentPeriodEnd && (status === 'ACTIVE' || status === 'TRIALING') && (
          <div style={{ color: colors.textSecondary, fontSize: 13 }}>
            Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            {subscription.cancelAtPeriodEnd && ' (canceling at period end)'}
          </div>
        )}
        {subscription?.priceMonthly && (
          <div style={{ color: colors.textSecondary, fontSize: 13 }}>${subscription.priceMonthly}/month after trial</div>
        )}

        {error && <div style={{ color: colors.accent, fontSize: 13, marginTop: spacing.sm }}>{error}</div>}

        <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md }}>
          {canSubscribe && (
            <button onClick={handleSubscribe} disabled={busy} style={primaryButtonStyle}>
              {busy ? 'Starting…' : 'Start 5-day trial ($5/mo after)'}
            </button>
          )}
          {canCancel && (
            <button onClick={handleCancel} disabled={busy} style={secondaryButtonStyle}>
              {busy ? 'Canceling…' : 'Cancel subscription'}
            </button>
          )}
        </div>
      </div>

      <div style={{ color: colors.textSecondary, fontSize: 12, textTransform: 'uppercase', margin: `${spacing.lg}px 0 ${spacing.sm}px` }}>
        Charge history
      </div>
      {charges.length === 0 && <p style={{ color: colors.textSecondary }}>No charges yet.</p>}
      {charges.map((charge) => (
        <div
          key={charge.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: `${spacing.sm}px 0`,
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <div>
            <div style={{ color: colors.textPrimary }}>
              {charge.chargeType === 'SUBSCRIPTION' ? 'Subscription' : 'Challenge skip'}
            </div>
            <div style={{ color: colors.textSecondary, fontSize: 12 }}>
              {new Date(charge.createdAt).toLocaleString()}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: colors.textPrimary, fontWeight: 700 }}>
              ${Number(charge.amount).toFixed(2)}
            </div>
            <div style={{ color: colors.textSecondary, fontSize: 12 }}>{charge.status}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const primaryButtonStyle: React.CSSProperties = {
  flex: 1,
  background: colors.primary,
  border: 'none',
  borderRadius: 999,
  padding: spacing.md,
  color: colors.textPrimary,
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  flex: 1,
  background: 'transparent',
  border: `1px solid ${colors.border}`,
  borderRadius: 999,
  padding: spacing.md,
  color: colors.textSecondary,
  fontWeight: 600,
  cursor: 'pointer',
};
