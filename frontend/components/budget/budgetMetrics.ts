import type { BudgetCategory, Asset } from '@/lib/types';
import { MACRO_GROUPS, EMERGENCY_FUND_TARGET_MONTHS } from './constants';
import { getAssetDisplayValue } from '../AssetAccordion/helpers';

export function computeTotalIncome(incomeItems: { amount: number }[]): number {
    return incomeItems.reduce((s, i) => s + i.amount, 0);
}

export function computeTotalBudget(categories: BudgetCategory[]): number {
    return categories.reduce((s, c) => s + c.budget_amount, 0);
}

export function computeInvestmentRatio(categories: BudgetCategory[], totalIncome: number): number {
    const investmentBudgets = categories
        .filter(c => c.group_name === 'Investment')
        .reduce((s, c) => s + c.budget_amount, 0);
    return totalIncome > 0 ? (investmentBudgets / totalIncome) * 100 : 0;
}

export function computeEmergencyFund(categories: BudgetCategory[], assets: Asset[]) {
    const fluidAssetsTotal = assets
        .filter(a => (a.category === 'Fluid' || a.category === 'Crypto') && a.include_in_net_worth !== false)
        .reduce((s, a) => s + getAssetDisplayValue(a), 0);
    const survivalMonthlyCost = categories
        .filter(c => c.group_name === 'Fixed' || c.group_name === 'Living')
        .reduce((s, c) => s + c.budget_amount, 0);
    const target = survivalMonthlyCost * EMERGENCY_FUND_TARGET_MONTHS;
    const progress = target > 0 ? Math.min((fluidAssetsTotal / target) * 100, 100) : 0;
    return { fluidAssetsTotal, survivalMonthlyCost, target, progress };
}

export function groupBudgetsByMacroGroup(categories: BudgetCategory[]): Record<string, BudgetCategory[]> {
    return MACRO_GROUPS.reduce((acc, group) => {
        acc[group] = categories.filter(c => (c.group_name || 'Unassigned') === group);
        return acc;
    }, {} as Record<string, BudgetCategory[]>);
}
