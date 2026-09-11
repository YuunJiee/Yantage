import { describe, it, expect } from 'vitest';
import { isProviderManaged } from './providerRules';

describe('isProviderManaged', () => {
    it.each(['max', 'binance', 'pionex', 'wallet'])('is true for %s', (source) => {
        expect(isProviderManaged(source)).toBe(true);
    });

    it.each(['manual', undefined, null, '', 'web3_wallet'])('is false for %s', (source) => {
        expect(isProviderManaged(source as string | undefined | null)).toBe(false);
    });
});
