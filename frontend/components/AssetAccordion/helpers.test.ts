import { describe, it, expect } from 'vitest';
import { getAssetDisplayValue } from './helpers';
import type { Asset } from '@/lib/types';

function asset(overrides: Partial<Asset>): Asset {
    return {
        id: 1,
        name: 'Test',
        category: 'Fluid',
        current_price: 0,
        ...overrides,
    } as Asset;
}

describe('getAssetDisplayValue', () => {
    it('uses value_twd when it is set and non-zero', () => {
        expect(getAssetDisplayValue(asset({ value_twd: 500, current_price: 999, transactions: [] }))).toBe(500);
    });

    it('falls back to current_price * summed transactions when value_twd is undefined', () => {
        const a = asset({
            value_twd: undefined,
            current_price: 100,
            transactions: [{ id: 1, asset_id: 1, amount: 3, buy_price: 90, date: '2026-01-01' }],
        });
        expect(getAssetDisplayValue(a)).toBe(300);
    });

    it('falls back to current_price * summed transactions when value_twd is exactly 0', () => {
        // A fully-closed position: value_twd legitimately computes to 0 server-side,
        // but this asset is testing the fallback branch specifically (Decision 12).
        const a = asset({
            value_twd: 0,
            current_price: 50,
            transactions: [{ id: 1, asset_id: 1, amount: 2, buy_price: 40, date: '2026-01-01' }],
        });
        expect(getAssetDisplayValue(a)).toBe(100);
    });

    it('returns 0 when there are no transactions and no value_twd', () => {
        expect(getAssetDisplayValue(asset({ value_twd: undefined, transactions: undefined }))).toBe(0);
    });
});
