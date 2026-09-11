import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BudgetCategoryFormSheet, type BudgetFormState } from './BudgetCategoryFormSheet';

function baseForm(overrides: Partial<BudgetFormState> = {}): BudgetFormState {
    return { name: '食物', icon: '', budget_amount: '5000', color: 'emerald', note: '', group_name: 'Living', ...overrides };
}

describe('BudgetCategoryFormSheet — amount validation (docs/specs/budgets-income.md Decision 4)', () => {
    it('disables submit when budget_amount is negative', () => {
        render(
            <BudgetCategoryFormSheet
                isOpen onClose={() => {}} editingBudgetId={null}
                budgetForm={baseForm({ budget_amount: '-1' })} setBudgetForm={() => {}}
                onSubmit={() => {}} confirmDelete={false} setConfirmDelete={() => {}} onDelete={() => {}}
            />
        );
        expect(screen.getByRole('button', { name: '新增類別' })).toBeDisabled();
    });

    it('allows submit when budget_amount is 0', () => {
        render(
            <BudgetCategoryFormSheet
                isOpen onClose={() => {}} editingBudgetId={null}
                budgetForm={baseForm({ budget_amount: '0' })} setBudgetForm={() => {}}
                onSubmit={() => {}} confirmDelete={false} setConfirmDelete={() => {}} onDelete={() => {}}
            />
        );
        expect(screen.getByRole('button', { name: '新增類別' })).not.toBeDisabled();
    });

    it('disables submit while loading', () => {
        render(
            <BudgetCategoryFormSheet
                isOpen onClose={() => {}} editingBudgetId={null}
                budgetForm={baseForm()} setBudgetForm={() => {}}
                onSubmit={() => {}} loading confirmDelete={false} setConfirmDelete={() => {}} onDelete={() => {}}
            />
        );
        expect(screen.getByRole('button', { name: '儲存中…' })).toBeDisabled();
    });
});

describe('BudgetCategoryFormSheet — delete confirmation loading state', () => {
    it('passes the deleting flag through to the confirm-delete control', () => {
        render(
            <BudgetCategoryFormSheet
                isOpen onClose={() => {}} editingBudgetId={1}
                budgetForm={baseForm()} setBudgetForm={() => {}}
                onSubmit={() => {}} confirmDelete setConfirmDelete={() => {}} onDelete={() => {}} deleting
            />
        );
        expect(screen.getByText('刪除中…')).toBeInTheDocument();
    });
});
