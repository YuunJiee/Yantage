import { describe, it, expect } from 'vitest';
import type { BudgetCategory, Asset } from '@/lib/types';
import {
    computeTotalIncome,
    computeTotalBudget,
    computeInvestmentRatio,
    computeEmergencyFund,
    groupBudgetsByMacroGroup,
} from './budgetMetrics';

function makeCategory(overrides: Partial<BudgetCategory>): BudgetCategory {
    return {
        id: 1,
        name: 'Test',
        budget_amount: 0,
        icon: null,
        color: null,
        note: null,
        group_name: 'Unassigned',
        ...overrides,
    } as BudgetCategory;
}

function makeAsset(overrides: Partial<Asset>): Asset {
    return {
        id: 1,
        name: 'Test Asset',
        category: 'Fluid',
        value_twd: 0,
        ...overrides,
    } as Asset;
}

describe('computeTotalIncome', () => {
    it('sums income item amounts', () => {
        expect(computeTotalIncome([{ amount: 1000 }, { amount: 2500 }])).toBe(3500);
    });

    it('returns 0 for an empty list', () => {
        expect(computeTotalIncome([])).toBe(0);
    });
});

describe('computeTotalBudget', () => {
    it('sums category budget amounts', () => {
        const categories = [makeCategory({ budget_amount: 100 }), makeCategory({ budget_amount: 200 })];
        expect(computeTotalBudget(categories)).toBe(300);
    });
});

describe('computeInvestmentRatio', () => {
    it('computes the percentage of income allocated to Investment-group budgets', () => {
        const categories = [
            makeCategory({ group_name: 'Investment', budget_amount: 2000 }),
            makeCategory({ group_name: 'Living', budget_amount: 3000 }),
        ];
        expect(computeInvestmentRatio(categories, 10000)).toBe(20);
    });

    it('returns 0 when total income is 0 (avoids division by zero)', () => {
        const categories = [makeCategory({ group_name: 'Investment', budget_amount: 2000 })];
        expect(computeInvestmentRatio(categories, 0)).toBe(0);
    });
});

describe('computeEmergencyFund', () => {
    it('computes fluid+crypto total, 3-month survival target, and progress', () => {
        const categories = [
            makeCategory({ group_name: 'Fixed', budget_amount: 10000 }),
            makeCategory({ group_name: 'Living', budget_amount: 5000 }),
            makeCategory({ group_name: 'Investment', budget_amount: 999999 }),
        ];
        const assets = [
            makeAsset({ category: 'Fluid', value_twd: 20000 }),
            makeAsset({ category: 'Crypto', value_twd: 10000 }),
            makeAsset({ category: 'Stock', value_twd: 999999 }),
        ];
        const result = computeEmergencyFund(categories, assets);
        expect(result.fluidAssetsTotal).toBe(30000);
        expect(result.survivalMonthlyCost).toBe(15000);
        expect(result.target).toBe(45000);
        expect(result.progress).toBeCloseTo((30000 / 45000) * 100);
    });

    it('caps progress at 100 and avoids division by zero when target is 0', () => {
        const noTarget = computeEmergencyFund([], []);
        expect(noTarget.target).toBe(0);
        expect(noTarget.progress).toBe(0);

        const categories = [makeCategory({ group_name: 'Living', budget_amount: 100 })];
        const assets = [makeAsset({ category: 'Fluid', value_twd: 1_000_000 })];
        expect(computeEmergencyFund(categories, assets).progress).toBe(100);
    });
});

describe('groupBudgetsByMacroGroup', () => {
    it('buckets categories by group_name, defaulting missing ones to Unassigned', () => {
        const categories = [
            makeCategory({ group_name: 'Living' }),
            makeCategory({ group_name: undefined as unknown as string }),
        ];
        const grouped = groupBudgetsByMacroGroup(categories);
        expect(grouped['Living']).toHaveLength(1);
        expect(grouped['Unassigned']).toHaveLength(1);
    });
});
