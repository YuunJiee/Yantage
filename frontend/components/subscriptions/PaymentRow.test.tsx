import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PrivacyProvider } from '@/components/PrivacyProvider';
import type { CyclePayment } from '@/lib/types';
import { PaymentRow } from './PaymentRow';

function makePayment(overrides: Partial<CyclePayment> = {}): CyclePayment {
    return {
        id: 1, cycle_id: 1, member_id: 1, amount: 900, paid_at: null,
        member: { id: 1, subscription_id: 1, name: 'Alice' },
        ...overrides,
    };
}

describe('PaymentRow — toggle race guard (docs/specs/subscriptions.md UI/UX Contract)', () => {
    it('disables the toggle button while a request is in flight, preventing a double-click race', async () => {
        let resolveToggle: () => void;
        const onToggle = vi.fn(() => new Promise<void>(res => { resolveToggle = res; }));

        render(<PrivacyProvider><PaymentRow payment={makePayment()} onToggle={onToggle} /></PrivacyProvider>);

        const button = screen.getByRole('button');
        fireEvent.click(button);
        expect(button).toBeDisabled();

        fireEvent.click(button); // second click while in flight must not fire again
        expect(onToggle).toHaveBeenCalledTimes(1);

        resolveToggle!();
        await waitFor(() => expect(button).not.toBeDisabled());
    });

    it('shows the pinned payment amount via formatMoney, respecting privacy mode', () => {
        render(<PrivacyProvider><PaymentRow payment={makePayment({ amount: 900 })} onToggle={vi.fn()} /></PrivacyProvider>);
        expect(screen.getByText('$900')).toBeInTheDocument();
    });
});
