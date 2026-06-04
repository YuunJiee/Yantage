/**
 * Shared category styling constants.
 * Import from here instead of duplicating across pages.
 */

/** AccordionHeader background colour for each asset category (CSS variable–based). */
export const CATEGORY_COLORS: Record<string, string> = {
    Fluid: 'bg-[var(--color-fluid)]',
    Crypto: 'bg-[var(--color-crypto)]',
    Stock: 'bg-[var(--color-stock)]',
    Fixed: 'bg-[var(--color-fixed)]',
    Receivables: 'bg-[var(--color-receivables)]',
    Liabilities: 'bg-[var(--color-liabilities)]',
};

/** Icon container background tint for each asset category. */
export const CATEGORY_ICON_BG: Record<string, string> = {
    Fluid: 'bg-emerald-400/10',
    Crypto: 'bg-orange-500/10',
    Stock: 'bg-indigo-500/10',
    Fixed: 'bg-blue-400/10',
    Receivables: 'bg-orange-400/10',
    Liabilities: 'bg-red-400/10',
};

/** Icon colour for each asset category. */
export const CATEGORY_ICON_TEXT: Record<string, string> = {
    Fluid: 'text-emerald-400',
    Crypto: 'text-orange-500',
    Stock: 'text-indigo-500',
    Fixed: 'text-blue-400',
    Receivables: 'text-orange-400',
    Liabilities: 'text-red-400',
};

/** Ordered list of asset categories shown on the dashboard. */
export const DASHBOARD_CATEGORY_ORDER = [
    'Fluid',
    'Stock',
    'Crypto',
    'Fixed',
    'Receivables',
    'Liabilities',
] as const;

/** zh-TW display labels for asset categories. */
export const CATEGORY_ZH: Record<string, string> = {
    Fluid: '流動資產',
    Stock: '股票',
    Crypto: '加密貨幣',
    Fixed: '固定資產',
    Receivables: '應收帳款',
    Liabilities: '負債',
    Total: '總計',
};

/** Time range options shared by the trend chart and history page. */
export const CHART_RANGES = [
    { key: '30d', label: '30天' },
    { key: '3mo', label: '3個月' },
    { key: '6mo', label: '6個月' },
    { key: '1y', label: '1年' },
    { key: 'all', label: '全部' },
] as const;
