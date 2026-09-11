'use client';

import { usePrivacy } from '@/components/PrivacyProvider';
import { formatMoney } from './utils';

/** Returns a formatter that shows a placeholder instead of the real amount while privacy mode is on. */
export function usePrivateMoney() {
    const { isPrivacyMode } = usePrivacy();
    return (value: number, placeholder = '••••', opts?: Intl.NumberFormatOptions) =>
        isPrivacyMode ? placeholder : formatMoney(value, opts);
}
