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

/** Ordered list of asset categories shown on the dashboard. */
export const DASHBOARD_CATEGORY_ORDER = [
    'Fluid',
    'Stock',
    'Crypto',
    'Fixed',
    'Receivables',
    'Liabilities',
] as const;

/** All categories except Liabilities — the denominator for "% of total assets" calcs. */
export const POSITIVE_CATEGORIES = DASHBOARD_CATEGORY_ORDER.filter(c => c !== 'Liabilities');

/** Raw CSS custom-property values per category (for chart libs like Recharts
 * that need the color string itself, not a Tailwind class — see CATEGORY_COLORS). */
export const CATEGORY_CSS_VARS: Record<string, string> = {
    Fluid: 'var(--color-fluid)',
    Crypto: 'var(--color-crypto)',
    Stock: 'var(--color-stock)',
    Fixed: 'var(--color-fixed)',
    Receivables: 'var(--color-receivables)',
    Liabilities: 'var(--color-liabilities)',
};

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

/** Selectable sub-categories per asset category. */
export const SUB_CATEGORIES: Record<string, string[]> = {
    Fluid: ['Cash', 'E-Wallet', 'Debit Card', 'Other'],
    Stock: ['TW Stock', 'US Stock', 'ETF', 'Bond', 'Mutual Fund', 'Other Investment'],
    Crypto: ['Coin', 'Token', 'Stablecoin', 'DeFi', 'NFT'],
    Fixed: ['Real Estate', 'Car', 'Other Fixed Asset'],
    Receivables: [],
    Liabilities: ['Credit Card', 'Loan', 'Payable', 'Other Liability'],
};

/** zh-TW display labels for sub-categories. */
export const SUB_CATEGORY_ZH: Record<string, string> = {
    'Cash': '現金', 'E-Wallet': '電子錢包', 'Debit Card': '簽帳金融卡', 'Other': '其他',
    'Coin': '幣', 'Token': '代幣', 'Stablecoin': '穩定幣', 'DeFi': 'DeFi', 'NFT': 'NFT',
    'TW Stock': '台股', 'US Stock': '美股', 'ETF': 'ETF', 'Bond': '債券',
    'Mutual Fund': '共同基金', 'Fund': '基金', 'Stock': '股票', 'Crypto': '加密貨幣',
    'Other Investment': '其他投資', 'Real Estate': '房地產', 'Car': '車輛',
    'Other Fixed Asset': '其他固定資產', 'Credit Card': '信用卡',
    'Loan': '貸款', 'Payable': '應付帳款', 'Other Liability': '其他負債',
};

export const getSubCategoryLabel = (key: string) => SUB_CATEGORY_ZH[key] ?? key;

/** Time range options shared by the trend chart and history page. */
export const CHART_RANGES = [
    { key: '30d', label: '30天' },
    { key: '3mo', label: '3個月' },
    { key: '6mo', label: '6個月' },
    { key: '1y', label: '1年' },
    { key: 'all', label: '全部' },
] as const;
