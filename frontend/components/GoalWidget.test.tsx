import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrivacyProvider, usePrivacy } from '@/components/PrivacyProvider';
import type { Asset, DashboardData, Goal } from '@/lib/types';

const goals: Goal[] = [];
const forecastsByGoalId: Record<string, unknown> = {};

vi.mock('@/lib/hooks', () => ({
    useGoals: () => ({ goals, isError: false, isLoading: false, refresh: vi.fn() }),
    useForecast: () => ({ forecastsByGoalId, isError: false, isLoading: false }),
}));

import { GoalWidget } from './GoalWidget';

function asset(overrides: Partial<Asset>): Asset {
    return { id: 1, name: 'A', category: 'Fluid', current_price: 0, value_twd: 0, ...overrides } as Asset;
}

function renderWidget(data: DashboardData | null) {
    return render(
        <PrivacyProvider>
            <GoalWidget dashboardData={data} onEditGoal={() => {}} onAddGoal={() => {}} />
        </PrivacyProvider>
    );
}

beforeEach(() => {
    goals.length = 0;
    for (const k of Object.keys(forecastsByGoalId)) delete forecastsByGoalId[k];
    localStorage.clear();
});

describe('GoalWidget — NET_WORTH progress', () => {
    it('clamps progress at 0% instead of showing a negative percentage when net worth is negative', () => {
        goals.push({ id: 1, name: 'Retire', goal_type: 'NET_WORTH', target_amount: 1_000_000 });
        renderWidget({ net_worth: -50_000, assets: [] } as unknown as DashboardData);
        expect(screen.getByText('0.0%')).toBeInTheDocument();
    });
});

describe('GoalWidget — ASSET_ALLOCATION denominator (docs/specs/goals.md R2)', () => {
    it('excludes Liabilities from the total-assets denominator', () => {
        goals.push({
            id: 2, name: 'Balanced', goal_type: 'ASSET_ALLOCATION', target_amount: 100,
            allocation_data: JSON.stringify({ Stock: 100 }),
        });
        const assets = [
            asset({ id: 1, category: 'Stock', value_twd: 500, transactions: [] }),
            asset({ id: 2, category: 'Liabilities', value_twd: 500, transactions: [] }),
        ];
        renderWidget({ net_worth: 0, assets } as unknown as DashboardData);
        // Denominator should be Stock-only (500), so Stock is 100% of the
        // positive-assets total, not 50% (which including the Liability
        // asset in the denominator would produce).
        expect(screen.getByText(/100\.0%/)).toBeInTheDocument();
    });

    it('does not mask the current-allocation percentage under privacy mode', () => {
        goals.push({
            id: 3, name: 'Balanced', goal_type: 'ASSET_ALLOCATION', target_amount: 100,
            allocation_data: JSON.stringify({ Stock: 100 }),
        });
        const assets = [asset({ id: 1, category: 'Stock', value_twd: 500, transactions: [] })];

        function Harness() {
            const { togglePrivacyMode } = usePrivacy();
            return (
                <>
                    <button onClick={togglePrivacyMode}>toggle</button>
                    <GoalWidget dashboardData={{ net_worth: 0, assets } as unknown as DashboardData} onEditGoal={() => {}} onAddGoal={() => {}} />
                </>
            );
        }

        render(<PrivacyProvider><Harness /></PrivacyProvider>);
        fireEvent.click(screen.getByText('toggle'));

        expect(screen.getByText(/100\.0%/)).toBeInTheDocument();
        expect(screen.queryByText('••%')).not.toBeInTheDocument();
    });
});
