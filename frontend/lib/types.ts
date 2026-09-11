/**
 * Shared TypeScript interfaces for Yantage frontend.
 * Import from here instead of using `any`.
 */

export interface Transaction {
    id: number;
    asset_id: number;
    amount: number;
    buy_price: number;
    date: string;
    note?: string;
    is_transfer?: boolean;
}

export interface Asset {
    id: number;
    name: string;
    ticker?: string | null;
    category: 'Fluid' | 'Stock' | 'Crypto' | 'Fixed' | 'Receivables' | 'Liabilities';
    sub_category?: string | null;
    source?: string;
    icon?: string | null;
    current_price?: number;
    include_in_net_worth?: boolean;
    payment_due_day?: number | null;
    // Computed fields returned by /api/dashboard/
    value_twd?: number;
    unrealized_pl?: number;
    roi?: number;
    transactions?: Transaction[];
    // Integration fields
    connection_id?: number;
    network?: string;
    contract_address?: string;
    decimals?: number;
    last_updated_at?: string;
    /** Nested integration connection, if asset is linked to an exchange/wallet */
    connection?: {
        id: number;
        name: string;
        provider: string;
    } | null;
    /** Discriminant — ensures AssetGroup narrows correctly in union types */
    isGroup?: never;
}


export interface Goal {
    id: number;
    name: string;
    goal_type: 'NET_WORTH' | 'ASSET_ALLOCATION';
    target_amount: number;
    allocation_data?: string;    // JSON: {"Stock": 60, "Fluid": 40} for ASSET_ALLOCATION
}

export interface BudgetCategory {
    id: number;
    name: string;
    icon?: string | null;
    budget_amount: number;
    color?: string | null;
    note?: string | null;
    group_name?: string | null;
    created_at: string;
}

export interface IncomeItem {
    id: number;
    name: string;
    amount: number;
    created_at: string;
}

export interface DashboardData {
    net_worth: number;
    total_pl: number;
    total_roi: number;
    exchange_rate: number;
    assets: Asset[];
    updated_at: string;
}

/** A web3 wallet group combining multiple wallet addresses of the same token */
export interface AssetGroup {
    isGroup: true;
    groupKey: string;
    assets: Asset[];
    name: string;
    ticker?: string | null;
    icon?: string | null;
    category: Asset['category'];
    sub_category?: string | null;
    totalValue: number;
    last_updated_at: string | null;
}

/** A single forecast entry returned by /api/stats/forecast */
export interface GoalForecast {
    goal_id: number;
    current_amount: number;
    target_amount: number;
    avg_monthly_growth: number;
    months_to_reach: number;
    predicted_date: string;
}

/** Net-worth history data point returned by /api/stats/history */
export interface HistoryPoint {
    date: string;
    value: number;
    breakdown?: Record<string, number>;
}

/** Ticker lookup result returned by /api/assets/lookup/{ticker} */
export interface TickerLookupResult {
    name?: string;
    symbol?: string;
    price?: number;
    error?: string;
}

/** Forecast envelope returned by /api/stats/forecast */
export interface ForecastResponse {
    growth_rate_6mo: number;
    forecasts: GoalForecast[];
}

// --- Subscription split types ---

export interface SubscriptionMember {
    id: number;
    subscription_id: number;
    name: string;
}

export interface CyclePayment {
    id: number;
    cycle_id: number;
    member_id: number;
    amount: number;
    paid_at: string | null;
    member: SubscriptionMember;
}

export interface CollectionCycle {
    id: number;
    subscription_id: number;
    cycle_start: string;
    note: string | null;
    created_at: string;
    payments: CyclePayment[];
}

export interface Subscription {
    id: number;
    name: string;
    total_cost: number;
    total_shares: number;
    my_shares: number;
    collection_period_months: number;
    created_at: string;
    members: SubscriptionMember[];
    cycles: CollectionCycle[];
}
