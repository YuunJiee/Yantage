import { describe, it, expect } from 'vitest';
import { formatMoney } from './utils';

describe('formatMoney', () => {
    it('formats a positive integer with $ prefix and thousands separators', () => {
        expect(formatMoney(12345)).toBe('$12,345');
    });

    it('formats zero', () => {
        expect(formatMoney(0)).toBe('$0');
    });

    it('formats negative numbers', () => {
        expect(formatMoney(-500)).toBe('$-500');
    });

    it('respects passed-through Intl.NumberFormat options', () => {
        expect(formatMoney(1234.5, { maximumFractionDigits: 1 })).toBe('$1,234.5');
    });
});
