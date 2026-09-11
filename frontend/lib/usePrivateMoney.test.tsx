import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PrivacyProvider, usePrivacy } from '@/components/PrivacyProvider';
import { usePrivateMoney } from './usePrivateMoney';

const wrapper = ({ children }: { children: ReactNode }) => <PrivacyProvider>{children}</PrivacyProvider>;

describe('usePrivateMoney', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('shows the real formatted amount when privacy mode is off', () => {
        const { result } = renderHook(() => usePrivateMoney(), { wrapper });
        expect(result.current(12345)).toBe('$12,345');
    });

    it('shows the default placeholder when privacy mode is on', () => {
        const { result } = renderHook(() => ({ privateMoney: usePrivateMoney(), privacy: usePrivacy() }), { wrapper });
        act(() => result.current.privacy.togglePrivacyMode());
        expect(result.current.privateMoney(12345)).toBe('••••');
    });

    it('shows a custom placeholder when privacy mode is on', () => {
        const { result } = renderHook(() => ({ privateMoney: usePrivateMoney(), privacy: usePrivacy() }), { wrapper });
        act(() => result.current.privacy.togglePrivacyMode());
        expect(result.current.privateMoney(12345, '••••••')).toBe('••••••');
    });
});
