import { describe, it, expect } from 'vitest';
import type { Subscription, CyclePayment } from '@/lib/types';
import { perMemberAmount, formatDate, sortPaymentsByMemberName } from './helpers';

function makeSub(overrides: Partial<Subscription>): Subscription {
    return {
        id: 1,
        name: 'Test Sub',
        total_cost: 300,
        total_shares: 3,
        collection_period_months: 1,
        cycles: [],
        ...overrides,
    } as Subscription;
}

describe('perMemberAmount', () => {
    it('divides total cost by shares and multiplies by the collection period', () => {
        const sub = makeSub({ total_cost: 300, total_shares: 3, collection_period_months: 2 });
        expect(perMemberAmount(sub)).toBe(200);
    });

    it('returns 0 when total_shares is 0 (avoids division by zero)', () => {
        const sub = makeSub({ total_cost: 300, total_shares: 0 });
        expect(perMemberAmount(sub)).toBe(0);
    });
});

describe('formatDate', () => {
    it('replaces hyphens with slashes', () => {
        expect(formatDate('2026-09-11')).toBe('2026/09/11');
    });
});

function makePayment(overrides: Partial<CyclePayment>): CyclePayment {
    return {
        id: 1, cycle_id: 1, member_id: 1, amount: 100, paid_at: null,
        member: { id: 1, subscription_id: 1, name: 'Z' },
        ...overrides,
    } as CyclePayment;
}

describe('sortPaymentsByMemberName', () => {
    it('sorts payments by member name, without mutating the input array', () => {
        const original = [
            makePayment({ id: 1, member: { id: 1, subscription_id: 1, name: 'Charlie' } }),
            makePayment({ id: 2, member: { id: 2, subscription_id: 1, name: 'Alice' } }),
            makePayment({ id: 3, member: { id: 3, subscription_id: 1, name: 'Bob' } }),
        ];
        const sorted = sortPaymentsByMemberName(original);
        expect(sorted.map(p => p.member.name)).toEqual(['Alice', 'Bob', 'Charlie']);
        expect(original.map(p => p.member.name)).toEqual(['Charlie', 'Alice', 'Bob']);
    });
});
