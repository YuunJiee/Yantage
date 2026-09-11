/**
 * SWR-based data-fetching hooks.
 *
 * Why SWR?
 * - Automatic deduplication: multiple components calling `useDashboard()` at the
 *   same render cycle share ONE in-flight request.
 * - Stale-while-revalidate: returns cached data immediately (no loading flash),
 *   then silently refreshes in the background.
 * - Built-in error / loading states — no manual `try/catch` boilerplate per page.
 *
 * Cache keys follow the pattern: the actual API URL string so SWR can
 * automatically invalidate when you call `mutate(key)`.
 */

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import {
    fetchDashboardData,
    fetchHistory,
    fetchBudgetCategories,
    fetchIncomeItems,
    fetchSetting,
    updateSetting,
    fetchSubscriptions,
    fetchGoals,
    fetchForecast,
    fetchIntegrations,
    type IntegrationConnectionResponse,
    API_URL,
} from './api';
import type { DashboardData, BudgetCategory, IncomeItem, HistoryPoint, Subscription, Goal, GoalForecast } from './types';
import { DASHBOARD_CATEGORY_ORDER } from './constants';

export type { HistoryPoint };

// ── SWR key factories (stable strings used as cache keys) ────────────────────
export const SWR_KEYS = {
    dashboard:    `${API_URL}/dashboard/`,
    history:      (range: string) => `${API_URL}/stats/history?range=${range}`,
    budgets:      `${API_URL}/budgets/categories`,
    income:       `${API_URL}/income/items`,
    setting:      (key: string) => `${API_URL}/settings/${key}`,
    subscriptions: `${API_URL}/subscriptions/`,
    goals:        `${API_URL}/goals/`,
    forecast:     `${API_URL}/stats/forecast`,
    integrations: `${API_URL}/integrations/`,
} as const;

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Primary dashboard data (net worth, asset list, FX rate, etc.).
 * All components that display any asset data can call this — SWR deduplicates
 * them into a single network request per revalidation window.
 */
export function useDashboard(fallbackData?: DashboardData) {
    const { data, error, isLoading, mutate } = useSWR<DashboardData>(
        SWR_KEYS.dashboard,
        fetchDashboardData,
        { refreshInterval: 60 * 60 * 1000, fallbackData },
    );
    return {
        dashboard: data,
        assets: data?.assets ?? [],
        isLoading,
        isError: !!error,
        refresh: mutate,
    };
}

/**
 * Net-worth history for a given time range.
 * Each range is cached independently (e.g. '30d', '1y', 'all').
 */
export function useNetWorthHistory(range: string) {
    const { data, error, isLoading } = useSWR<HistoryPoint[]>(
        SWR_KEYS.history(range),
        () => fetchHistory(range),
        {
            // History data changes only after the nightly snapshot job →
            // revalidate at most once per 5 minutes to avoid hammering the DB.
            dedupingInterval: 5 * 60 * 1000,
        },
    );
    return {
        history: data ?? [],
        isLoading,
        isError: !!error,
    };
}

/**
 * Budget categories list.
 */
export function useBudgetCategories() {
    const { data, error, isLoading, mutate } = useSWR<BudgetCategory[]>(
        SWR_KEYS.budgets,
        fetchBudgetCategories,
    );
    return {
        categories: data ?? [],
        isLoading,
        isError: !!error,
        refresh: mutate,
    };
}

/**
 * Income items list.
 */
export function useIncomeItems() {
    const { data, error, isLoading, mutate } = useSWR<IncomeItem[]>(
        SWR_KEYS.income,
        fetchIncomeItems,
    );
    return {
        incomeItems: data ?? [],
        isLoading,
        isError: !!error,
        refresh: mutate,
    };
}

/**
 * Subscription split-tracking list.
 */
export function useSubscriptions() {
    const { data, error, isLoading, mutate } = useSWR<Subscription[]>(
        SWR_KEYS.subscriptions,
        fetchSubscriptions,
        { revalidateOnFocus: false },
    );
    return {
        subscriptions: data ?? [],
        isLoading,
        isError: !!error,
        refresh: mutate,
    };
}

/**
 * Financial goals list.
 */
export function useGoals() {
    const { data, error, isLoading, mutate } = useSWR<Goal[]>(SWR_KEYS.goals, fetchGoals);
    return {
        goals: data ?? [],
        isLoading,
        isError: !!error,
        refresh: mutate,
    };
}

/**
 * Goal-forecast predictions, keyed by goal id for easy lookup.
 */
export function useForecast() {
    const { data, error, isLoading } = useSWR(SWR_KEYS.forecast, fetchForecast);
    const forecastsByGoalId = (data?.forecasts ?? []).reduce((acc, f: GoalForecast) => {
        acc[f.goal_id] = f;
        return acc;
    }, {} as Record<number, GoalForecast>);
    return {
        forecastsByGoalId,
        isLoading,
        isError: !!error,
    };
}

/**
 * Exchange/wallet integration connections. Replaces the raw useEffect+fetch
 * that AddAssetDialog and IntegrationManager each used to do independently
 * (docs/specs/assets-transactions.md Decision 16) — the only two call sites
 * in the app that bypassed SWR for data fetching.
 */
export function useIntegrations() {
    const { data, error, isLoading, mutate } = useSWR<IntegrationConnectionResponse[]>(
        SWR_KEYS.integrations,
        fetchIntegrations,
    );
    return {
        connections: data ?? [],
        isLoading,
        isError: !!error,
        refresh: mutate,
    };
}

/**
 * A single persisted application setting.
 */
export function useSetting(key: string) {
    const { data, error, isLoading, mutate } = useSWR<{ key: string; value: string }>(
        SWR_KEYS.setting(key),
        () => fetchSetting(key),
    );
    return {
        setting: data,
        value: data?.value,
        isLoading,
        isError: !!error,
        refresh: mutate,
    };
}

/**
 * Which asset categories show on the dashboard (the 'visible_categories' setting).
 * Caches the last known value in localStorage so the dashboard can paint
 * instantly on load instead of waiting for the settings fetch to resolve.
 */
export function useCategoryVisibility() {
    const { value: visibleCatsRaw, refresh } = useSetting('visible_categories');
    const [visibility, setVisibility] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!visibleCatsRaw) {
            const cached = localStorage.getItem('setting_visible_categories');
            if (cached) {
                try { setVisibility(JSON.parse(cached)); } catch { /* ignore */ }
            } else {
                const defaults: Record<string, boolean> = {};
                DASHBOARD_CATEGORY_ORDER.forEach(c => defaults[c] = true);
                setVisibility(defaults);
            }
            return;
        }
        try {
            const parsed = JSON.parse(visibleCatsRaw);
            setVisibility(parsed);
            localStorage.setItem('setting_visible_categories', JSON.stringify(parsed));
        } catch { /* ignore malformed JSON */ }
    }, [visibleCatsRaw]);

    const toggle = async (cat: string) => {
        const next = { ...visibility, [cat]: !visibility[cat] };
        setVisibility(next);
        try {
            await updateSetting('visible_categories', JSON.stringify(next));
            refresh();
        } catch (e) {
            console.error(e);
        }
    };

    return { visibility, toggle, isLoading: visibleCatsRaw === undefined };
}

