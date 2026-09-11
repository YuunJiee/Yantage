import { describe, it, expect } from 'vitest';
import type { Subscription } from '@/lib/types';
import { perMemberAmount, formatDate } from './helpers';

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
