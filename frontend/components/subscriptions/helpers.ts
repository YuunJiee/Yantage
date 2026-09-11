import type { Subscription } from '@/lib/types';

// total_cost = 每月費用（所有份數合計），每人每次收款 = (月費/份數) × 月數
export function perMemberAmount(sub: Subscription): number {
    if (sub.total_shares === 0) return 0;
    return (sub.total_cost / sub.total_shares) * sub.collection_period_months;
}

export function formatDate(d: string) {
    return d.replace(/-/g, '/');
}

export function todayStr() {
    return new Date().toISOString().slice(0, 10);
}
