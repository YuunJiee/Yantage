import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrivacyProvider } from '@/components/PrivacyProvider';

const state = {
    budgets: { categories: [] as unknown[], isLoading: false, isError: false, refresh: vi.fn() },
    income: { incomeItems: [] as unknown[], isLoading: false, isError: false, refresh: vi.fn() },
    dashboard: { dashboard: undefined as unknown, isLoading: false, isError: false, refresh: vi.fn() },
};

vi.mock('@/lib/hooks', () => ({
    useBudgetCategories: () => state.budgets,
    useIncomeItems: () => state.income,
    useDashboard: () => state.dashboard,
}));

vi.mock('@/lib/api', () => ({
    createBudgetCategory: vi.fn(),
    updateBudgetCategory: vi.fn(),
    deleteBudgetCategory: vi.fn(),
    createIncomeItem: vi.fn(),
    updateIncomeItem: vi.fn(),
    deleteIncomeItem: vi.fn(),
}));

import BudgetPage from './page';

function renderPage() {
    return render(<PrivacyProvider><BudgetPage /></PrivacyProvider>);
}

function reset() {
    state.budgets = { categories: [], isLoading: false, isError: false, refresh: vi.fn() };
    state.income = { incomeItems: [], isLoading: false, isError: false, refresh: vi.fn() };
    state.dashboard = { dashboard: undefined, isLoading: false, isError: false, refresh: vi.fn() };
}

describe('BudgetPage — combined loading/error gating (docs/specs/budgets-income.md Decision 9)', () => {
    it('shows the loading skeleton when only useIncomeItems is loading', () => {
        reset();
        state.income.isLoading = true;
        const { container } = renderPage();
        expect(container.querySelector('.animate-pulse')).toBeTruthy();
    });

    it('shows the loading skeleton when only useDashboard is loading', () => {
        reset();
        state.dashboard.isLoading = true;
        const { container } = renderPage();
        expect(container.querySelector('.animate-pulse')).toBeTruthy();
    });

    it('shows PageError when only useIncomeItems errors', () => {
        reset();
        state.income.isError = true;
        renderPage();
        expect(screen.getByRole('button', { name: /重試|重新|retry/i })).toBeInTheDocument();
    });

    it('shows PageError when only useDashboard errors', () => {
        reset();
        state.dashboard.isError = true;
        renderPage();
        expect(screen.getByRole('button', { name: /重試|重新|retry/i })).toBeInTheDocument();
    });

    it('renders the page normally when all three hooks are healthy', () => {
        reset();
        renderPage();
        expect(screen.getByText('預算規劃')).toBeInTheDocument();
    });
});
