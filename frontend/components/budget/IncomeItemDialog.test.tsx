import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/api', () => ({
    createIncomeItem: vi.fn(),
    updateIncomeItem: vi.fn(),
    deleteIncomeItem: vi.fn(),
}));

import { IncomeItemDialog } from './IncomeItemDialog';

describe('IncomeItemDialog — amount validation (docs/specs/budgets-income.md Decision 4)', () => {
    it('disables save when amount is negative', () => {
        render(<IncomeItemDialog open onOpenChange={() => {}} onSave={() => {}} editingItem={null} />);
        fireEvent.change(screen.getByLabelText('名稱'), { target: { value: 'Salary' } });
        fireEvent.change(screen.getByLabelText('預期收入'), { target: { value: '-100' } });
        expect(screen.getByRole('button', { name: '儲存變更' })).toBeDisabled();
    });

    it('enables save with a valid name and non-negative amount', () => {
        render(<IncomeItemDialog open onOpenChange={() => {}} onSave={() => {}} editingItem={null} />);
        fireEvent.change(screen.getByLabelText('名稱'), { target: { value: 'Salary' } });
        fireEvent.change(screen.getByLabelText('預期收入'), { target: { value: '50000' } });
        expect(screen.getByRole('button', { name: '儲存變更' })).not.toBeDisabled();
    });

    it('disables save when required fields are empty', () => {
        render(<IncomeItemDialog open onOpenChange={() => {}} onSave={() => {}} editingItem={null} />);
        expect(screen.getByRole('button', { name: '儲存變更' })).toBeDisabled();
    });
});
