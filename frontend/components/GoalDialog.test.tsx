import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Goal } from '@/lib/types';

vi.mock('@/lib/hooks', () => ({
    SWR_KEYS: { goals: 'goals', forecast: 'forecast' },
}));

vi.mock('@/lib/api', () => ({
    createGoal: vi.fn(),
    updateGoal: vi.fn(),
    deleteGoal: vi.fn(),
}));

import { GoalDialog } from './GoalDialog';

const existingGoal: Goal = {
    id: 1,
    name: 'Retire',
    goal_type: 'NET_WORTH',
    target_amount: 1_000_000,
};

describe('GoalDialog — goal_type is create-time-only (docs/specs/goals.md R6)', () => {
    it('disables the type selector when editing an existing goal', () => {
        render(<GoalDialog isOpen onClose={() => {}} initialGoal={existingGoal} />);
        expect(screen.getByText('FIRE / 淨值目標').closest('button')).toBeDisabled();
    });

    it('leaves the type selector enabled when creating a new goal', () => {
        render(<GoalDialog isOpen onClose={() => {}} initialGoal={null} />);
        expect(screen.getByText('FIRE / 淨值目標').closest('button')).not.toBeDisabled();
    });
});

describe('GoalDialog — target_amount must be positive (docs/specs/goals.md Decision 5)', () => {
    it('disables submit when the target amount field is empty', () => {
        render(<GoalDialog isOpen onClose={() => {}} initialGoal={null} />);
        expect(screen.getByRole('button', { name: '設定目標' })).toBeDisabled();
    });

    it('disables submit when the target amount is 0', () => {
        render(<GoalDialog isOpen onClose={() => {}} initialGoal={null} />);
        const input = screen.getByPlaceholderText('例如：30,000,000');
        fireEvent.change(input, { target: { value: '0' } });
        expect(screen.getByRole('button', { name: '設定目標' })).toBeDisabled();
    });

    it('enables submit once a positive target amount is entered', () => {
        render(<GoalDialog isOpen onClose={() => {}} initialGoal={null} />);
        const input = screen.getByPlaceholderText('例如：30,000,000');
        fireEvent.change(input, { target: { value: '1000000' } });
        expect(screen.getByRole('button', { name: '設定目標' })).not.toBeDisabled();
    });
});
