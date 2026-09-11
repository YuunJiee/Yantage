import type { Subscription, CyclePayment } from '@/lib/types';

// total_cost = 每月費用（所有份數合計），每人每次收款 = (月費/份數) × 月數
// Used only for the *live* current-rate preview (e.g. the subscription
// summary bar) — each CyclePayment's own `amount` is pinned at cycle
// creation time and must not be recomputed from this (see
// docs/specs/subscriptions.md R2).
export function perMemberAmount(sub: Subscription): number {
    if (sub.total_shares === 0) return 0;
    return (sub.total_cost / sub.total_shares) * sub.collection_period_months;
}

/** Stable display order for a cycle's payments — the backend doesn't sort them. */
export function sortPaymentsByMemberName(payments: CyclePayment[]): CyclePayment[] {
    return [...payments].sort((a, b) => a.member.name.localeCompare(b.member.name));
}

export function formatDate(d: string) {
    return d.replace(/-/g, '/');
}

export function todayStr() {
    return new Date().toISOString().slice(0, 10);
}
