'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { usePrivacy } from "@/components/PrivacyProvider";
import { fetchGoals, fetchForecast } from '@/lib/api';
import type { Goal, GoalForecast, DashboardData, Asset } from '@/lib/types';
import { CATEGORY_ZH } from '@/lib/constants';

function parseAllocation(data?: string | null): Record<string, number> | null {
    if (!data) return null;
    try {
        const parsed = JSON.parse(data);
        if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch { }
    return null;
}


export function GoalWidget({ dashboardData, refreshTrigger, onEditGoal }: {
    dashboardData: DashboardData | null | undefined;
    refreshTrigger: number;
    onEditGoal: (goal: Goal) => void;
}) {
    const { isPrivacyMode } = usePrivacy();
    const [goals, setGoals] = useState<Goal[]>([]);
    const [forecasts, setForecasts] = useState<Record<number, GoalForecast>>({});

    useEffect(() => { fetchGoals().then(setGoals).catch(() => {}); }, [refreshTrigger]);

    useEffect(() => {
        fetchForecast()
            .then(data => {
                const map: Record<number, GoalForecast> = {};
                data.forecasts.forEach((f: GoalForecast) => { map[f.goal_id] = f; });
                setForecasts(map);
            })
            .catch(() => {});
    }, [refreshTrigger]);

    const netWorth = dashboardData?.net_worth || 0;
    const assets: Asset[] = dashboardData?.assets || [];
    const totalValue = assets.filter(a => a.include_in_net_worth !== false).reduce((s, a) => s + (a.value_twd || 0), 0);
    const categoryValue = (cat: string) =>
        assets.filter(a => a.include_in_net_worth !== false && a.category === cat).reduce((s, a) => s + (a.value_twd || 0), 0);

    const fmt = (n: number) => isPrivacyMode ? '••••' : `$${new Intl.NumberFormat('en-US', { notation: 'compact' }).format(n)}`;

    if (goals.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal) => {

                /* ── NET_WORTH ─────────────────────────────── */
                if (goal.goal_type === 'NET_WORTH') {
                    const progress = Math.min((netWorth / goal.target_amount) * 100, 100);
                    const forecast = forecasts[goal.id];

                    return (
                        <div
                            key={goal.id}
                            onClick={() => onEditGoal(goal)}
                            className="cursor-pointer group"
                        >
                            <div className="flex items-baseline justify-between mb-2">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{goal.name}</span>
                                <span className="text-[11px] text-muted-foreground/70 tabular-nums">
                                    {fmt(netWorth)} / {fmt(goal.target_amount)}
                                </span>
                            </div>
                            <div className="flex items-end gap-2 mb-2">
                                <span className="font-display text-[1.6rem] font-medium tracking-tight tabular-nums leading-none">{progress.toFixed(1)}%</span>
                                {forecast && (
                                    <span className="text-[11px] text-muted-foreground/70 mb-0.5">預計 {forecast.predicted_date}</span>
                                )}
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-foreground/70 transition-all duration-700 rounded-full" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    );
                }

                /* ── ASSET_ALLOCATION ──────────────────────── */
                if (goal.goal_type === 'ASSET_ALLOCATION') {
                    const allocation = parseAllocation(goal.allocation_data);
                    if (!allocation) return null;

                    const entries = Object.entries(allocation) as [string, number][];
                    const isBalanced = entries.every(([cat, tgt]) => {
                        const cur = totalValue > 0 ? (categoryValue(cat) / totalValue) * 100 : 0;
                        return Math.abs(cur - tgt) <= 5;
                    });

                    return (
                        <div key={goal.id} onClick={() => onEditGoal(goal)} className="cursor-pointer">
                            <div className="flex items-baseline justify-between mb-3">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{goal.name}</span>
                                <span className={cn('text-xs font-medium', isBalanced ? 'text-emerald-600' : 'text-amber-500')}>
                                    {isBalanced ? '已平衡' : '失衡'}
                                </span>
                            </div>
                            <div className="space-y-2.5">
                                {entries.map(([cat, targetPct]) => {
                                    const currentPct = totalValue > 0 ? (categoryValue(cat) / totalValue) * 100 : 0;
                                    const diff = currentPct - targetPct;
                                    const barOk = Math.abs(diff) <= 5;

                                    return (
                                        <div key={cat}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-muted-foreground">{CATEGORY_ZH[cat] ?? cat}</span>
                                                <span className="tabular-nums text-muted-foreground/70">
                                                    {isPrivacyMode ? '••%' : `${currentPct.toFixed(1)}%`}
                                                    <span className="opacity-50"> / {targetPct}%</span>
                                                    {!isPrivacyMode && diff !== 0 && (
                                                        <span className={cn('ml-1', diff > 0 ? 'text-amber-500' : 'text-red-400')}>
                                                            ({diff > 0 ? '+' : ''}{diff.toFixed(1)}%)
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="h-1 w-full bg-muted rounded-full overflow-hidden relative">
                                                <div
                                                    className="absolute top-0 bottom-0 w-px bg-foreground/20 z-10"
                                                    style={{ left: `${Math.min(targetPct, 100)}%` }}
                                                />
                                                <div
                                                    className={cn('h-full transition-all duration-700 rounded-full', barOk ? 'bg-emerald-500/70' : diff > 5 ? 'bg-amber-400/70' : 'bg-red-400/70')}
                                                    style={{ width: `${Math.min(currentPct, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
}
