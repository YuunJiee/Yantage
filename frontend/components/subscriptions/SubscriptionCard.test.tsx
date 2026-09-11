import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PrivacyProvider } from '@/components/PrivacyProvider';
import type { Subscription } from '@/lib/types';

const toastMock = vi.fn();
vi.mock('@/components/ui/toast', () => ({
    useToast: () => ({ toast: toastMock }),
}));

const api = vi.hoisted(() => ({
    updateSubscription: vi.fn().mockResolvedValue({}),
    deleteSubscription: vi.fn().mockResolvedValue({}),
    addSubscriptionMember: vi.fn().mockResolvedValue({}),
    updateSubscriptionMember: vi.fn().mockResolvedValue({}),
    deleteSubscriptionMember: vi.fn().mockResolvedValue({}),
    deleteCollectionCycle: vi.fn().mockResolvedValue({}),
    updateCyclePayment: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/lib/api', () => api);

import { SubscriptionCard } from './SubscriptionCard';

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
    return {
        id: 1, name: 'Netflix', total_cost: 600, total_shares: 4, my_shares: 1,
        collection_period_months: 6, created_at: '2026-01-01',
        members: [{ id: 1, subscription_id: 1, name: 'Alice' }],
        cycles: [],
        ...overrides,
    };
}

function renderCard(sub: Subscription, onMutate = vi.fn()) {
    return render(<PrivacyProvider><SubscriptionCard sub={sub} onMutate={onMutate} /></PrivacyProvider>);
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('SubscriptionCard — cancel-edit resets the draft (docs/specs/subscriptions.md)', () => {
    it('shows the subscription current values, not a stale abandoned draft, each time edit mode is entered', () => {
        const sub = makeSub({ name: 'Netflix', total_cost: 600 });
        renderCard(sub);

        fireEvent.click(screen.getByLabelText('編輯 Netflix'));
        const nameInput = screen.getAllByRole('textbox')[0] as HTMLInputElement;
        fireEvent.change(nameInput, { target: { value: 'Abandoned Draft' } });

        fireEvent.click(screen.getByLabelText('取消編輯訂閱'));

        fireEvent.click(screen.getByLabelText('編輯 Netflix'));
        const reopenedNameInput = screen.getAllByRole('textbox')[0] as HTMLInputElement;
        expect(reopenedNameInput.value).toBe('Netflix');
    });
});

describe('SubscriptionCard — member rename (docs/specs/subscriptions.md Decision 4)', () => {
    it('renames a member via the pencil icon next to their name', async () => {
        const onMutate = vi.fn();
        const sub = makeSub();
        renderCard(sub, onMutate);

        fireEvent.click(screen.getByLabelText('編輯 Netflix'));
        expect(screen.getByText('Alice')).toBeInTheDocument();

        fireEvent.click(screen.getByLabelText('重新命名 Alice'));

        const renameInput = screen.getByDisplayValue('Alice');
        fireEvent.change(renameInput, { target: { value: 'Alicia' } });
        fireEvent.keyDown(renameInput, { key: 'Enter' });

        await waitFor(() => expect(api.updateSubscriptionMember).toHaveBeenCalledWith(1, 'Alicia'));
        await waitFor(() => expect(onMutate).toHaveBeenCalled());
    });
});

describe('SubscriptionCard — member delete requires confirmation (docs/specs/subscriptions.md Decision 5)', () => {
    it('does not delete on the first click; requires confirming, with cascade-scope warning copy', async () => {
        renderCard(makeSub());
        fireEvent.click(screen.getByLabelText('編輯 Netflix'));

        fireEvent.click(screen.getByLabelText('刪除成員 Alice'));

        expect(api.deleteSubscriptionMember).not.toHaveBeenCalled();
        expect(screen.getByText(/將一併刪除此成員所有週期的付款紀錄/)).toBeInTheDocument();

        fireEvent.click(screen.getByText('確定'));
        await waitFor(() => expect(api.deleteSubscriptionMember).toHaveBeenCalledWith(1));
    });
});

describe('SubscriptionCard — mutation failures surface a toast (docs/specs/subscriptions.md Decision 8)', () => {
    it('toasts when deleting the subscription fails', async () => {
        api.deleteSubscription.mockRejectedValueOnce(new Error('network error'));
        renderCard(makeSub());

        fireEvent.click(screen.getByLabelText('刪除 Netflix'));
        fireEvent.click(screen.getByText('確定'));

        await waitFor(() => expect(toastMock).toHaveBeenCalledWith('刪除訂閱失敗', 'error'));
    });

    it('toasts when adding a member fails', async () => {
        api.addSubscriptionMember.mockRejectedValueOnce(new Error('network error'));
        renderCard(makeSub());

        fireEvent.click(screen.getByLabelText('編輯 Netflix'));
        fireEvent.change(screen.getByPlaceholderText('新增成員名稱'), { target: { value: 'Bob' } });
        fireEvent.click(screen.getByLabelText('新增成員'));

        await waitFor(() => expect(toastMock).toHaveBeenCalledWith('新增成員失敗', 'error'));
    });
});

describe('SubscriptionCard — surfaces total_shares/my_shares (docs/specs/subscriptions.md R8)', () => {
    it('shows the share breakdown in the non-editing summary line', () => {
        renderCard(makeSub({ total_shares: 4, my_shares: 1 }));
        expect(screen.getByText(/共4份/)).toBeInTheDocument();
        expect(screen.getByText(/我1份/)).toBeInTheDocument();
    });
});
