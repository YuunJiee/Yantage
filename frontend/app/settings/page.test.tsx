import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/hooks', () => ({
    useSetting: () => ({ value: '1', isError: false, refresh: vi.fn() }),
    useCategoryVisibility: () => ({ visibility: {}, toggle: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
    updateSetting: vi.fn(),
    fetchDashboardData: vi.fn(),
    apiFetch: vi.fn(),
    API_URL: 'http://localhost:8000/api',
    fetchIntegrations: vi.fn().mockResolvedValue([]),
    createConnection: vi.fn(),
    deleteConnection: vi.fn(),
    syncProvider: vi.fn(),
}));

import SettingsPage from './page';

describe('SettingsPage — Integrations link', () => {
    it('renders a Quick Link to Integrations, unlike the other three (docs/specs/settings-system.md Known Inconsistency #2)', () => {
        render(<SettingsPage />);
        expect(screen.getByText('串接整合')).toBeInTheDocument();
    });

    it('opens the Integration dialog when the Integrations quick link is clicked', () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText('串接整合'));
        expect(screen.getAllByText('串接整合').length).toBeGreaterThan(1);
    });
});
