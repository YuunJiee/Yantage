// Use relative path '/api' which works with Next.js Rewrites (proxy)
// This avoids CORS and Mixed Content issues when deployed
import type { DashboardData, Asset, Transaction, BudgetCategory, IncomeItem, Goal, ForecastResponse, HistoryPoint, TickerLookupResult, Subscription, CollectionCycle, CyclePayment } from './types';

const isServer = typeof window === 'undefined';
export const API_URL = isServer
    ? (process.env.INTERNAL_API_URL || "http://127.0.0.1:8000/api")
    : "/api";

/**
 * Unified fetch wrapper. Throws on non-2xx with status + path + body fragment.
 * Single place to add auth headers, logging, or retries in the future.
 */
export async function apiFetch<T = unknown>(
    path: string,
    init?: RequestInit,
): Promise<T> {
    const url = `${API_URL}${path}`;
    const res = await fetch(url, { cache: 'no-store', ...init });
    if (!res.ok) {
        let detail = '';
        try { detail = (await res.text()).slice(0, 200); } catch { /* ignore */ }
        throw new Error(`API ${res.status} [${path}]${detail ? ': ' + detail : ''}`);
    }
    if (res.status === 204 || res.headers.get('content-length') === '0') return undefined as T;
    return res.json() as Promise<T>;
}

const json = (body: unknown): RequestInit => ({
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const fetchDashboardData = () => apiFetch<DashboardData>('/dashboard/');

// ── Settings ──────────────────────────────────────────────────────────────────
export const fetchSetting = (key: string) =>
    apiFetch<{ key: string; value: string }>(`/settings/${key}`);

export const updateSetting = (key: string, value: string) =>
    apiFetch(`/settings/${key}`, { method: 'PUT', ...json({ key, value }) });

// ── Stats ─────────────────────────────────────────────────────────────────────
export const fetchHistory = (range = '1y') =>
    apiFetch<HistoryPoint[]>(`/stats/history?range=${range}`);

export const fetchGoals = () => apiFetch<Goal[]>('/goals/');
export const fetchForecast = () => apiFetch<ForecastResponse>('/stats/forecast');

// ── Budget ────────────────────────────────────────────────────────────────────
export const fetchBudgetCategories = () =>
    apiFetch<BudgetCategory[]>('/budgets/categories');

// ── Income ────────────────────────────────────────────────────────────────────
export const fetchIncomeItems = () => apiFetch<IncomeItem[]>('/income/items');

export const createIncomeItem = (data: { name: string; amount: number }) =>
    apiFetch('/income/items', { method: 'POST', ...json(data) });

export const updateIncomeItem = (id: number, data: { name?: string; amount?: number }) =>
    apiFetch(`/income/items/${id}`, { method: 'PUT', ...json(data) });

export const deleteIncomeItem = (id: number) =>
    apiFetch(`/income/items/${id}`, { method: 'DELETE' });

// ── Assets ────────────────────────────────────────────────────────────────────
export function createAsset(assetData: {
    name: string;
    ticker: string | null;
    category: string;
    sub_category?: string | null;
    include_in_net_worth?: boolean;
    icon?: string | null;
    tags?: { name: string }[];
    current_price?: number | null;
    payment_due_day?: number | null;
    source?: string;
    network?: string;
    contract_address?: string;
    decimals?: number;
    connection_id?: number | null;
}) {
    return apiFetch<Asset>('/assets/', { method: 'POST', ...json(assetData) });
}

export const updateAsset = (assetId: number, assetData: Partial<Omit<Asset, 'id'>>) =>
    apiFetch<Asset>(`/assets/${assetId}`, { method: 'PUT', ...json(assetData) });

export const deleteAsset = (assetId: number) =>
    apiFetch(`/assets/${assetId}`, { method: 'DELETE' });

export const lookupTicker = (ticker: string) =>
    apiFetch<TickerLookupResult>(`/assets/lookup/${encodeURIComponent(ticker)}`);

// ── Transactions ──────────────────────────────────────────────────────────────
export const createTransaction = (assetId: number, transactionData: Omit<Transaction, 'id' | 'asset_id'>) =>
    apiFetch<Transaction>(`/assets/${assetId}/transactions/`, { method: 'POST', ...json(transactionData) });

export const updateTransaction = (id: number, data: Partial<Omit<Transaction, 'id'>>) =>
    apiFetch<Transaction>(`/assets/transactions/${id}`, { method: 'PUT', ...json(data) });

export const deleteTransaction = (id: number) =>
    apiFetch(`/assets/transactions/${id}`, { method: 'DELETE' });

// ── Integrations ──────────────────────────────────────────────────────────────
export const fetchIntegrations = () => apiFetch('/integrations/');

// ── Subscriptions ─────────────────────────────────────────────────────────────
export const fetchSubscriptions = () => apiFetch<Subscription[]>('/subscriptions/');

export const createSubscription = (data: {
    name: string;
    total_cost: number;
    total_shares: number;
    my_shares: number;
    collection_period_months: number;
    members: { name: string }[];
}) => apiFetch<Subscription>('/subscriptions/', { method: 'POST', ...json(data) });

export const updateSubscription = (id: number, data: Partial<{
    name: string;
    total_cost: number;
    total_shares: number;
    my_shares: number;
    collection_period_months: number;
}>) => apiFetch<Subscription>(`/subscriptions/${id}`, { method: 'PUT', ...json(data) });

export const deleteSubscription = (id: number) =>
    apiFetch(`/subscriptions/${id}`, { method: 'DELETE' });

export const addSubscriptionMember = (subscriptionId: number, name: string) =>
    apiFetch(`/subscriptions/${subscriptionId}/members`, { method: 'POST', ...json({ name }) });

export const deleteSubscriptionMember = (memberId: number) =>
    apiFetch(`/subscriptions/members/${memberId}`, { method: 'DELETE' });

export const createCollectionCycle = (subscriptionId: number, data: { cycle_start: string; note?: string }) =>
    apiFetch<CollectionCycle>(`/subscriptions/${subscriptionId}/cycles`, { method: 'POST', ...json(data) });

export const deleteCollectionCycle = (cycleId: number) =>
    apiFetch(`/subscriptions/cycles/${cycleId}`, { method: 'DELETE' });

export const updateCyclePayment = (paymentId: number, data: { paid_at: string | null; note?: string }) =>
    apiFetch<CyclePayment>(`/subscriptions/payments/${paymentId}`, { method: 'PATCH', ...json(data) });
