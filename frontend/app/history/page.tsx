'use client';

import { useState, useMemo } from "react";
import { ArrowDownLeft, ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";
import { usePrivacy } from "@/components/PrivacyProvider";
import { cn } from "@/lib/utils";
import { useDashboard, useNetWorthHistory } from "@/lib/hooks";
import type { Asset, Transaction } from "@/lib/types";
import { TransactionEditDialog } from "@/components/TransactionEditDialog";
import { PageError } from "@/components/ui/skeleton";
import { CATEGORY_ZH, CHART_RANGES } from '@/lib/constants';

interface EnrichedTransaction extends Transaction {
    assetName: string;
    assetTicker?: string | null;
    category: Asset['category'];
    assetSource?: string;
    valueTwd?: number;
}

type View = 'transactions' | 'monthly';

export default function HistoryPage() {
    const [view, setView] = useState<View>('transactions');
    const [range, setRange] = useState<string>('all');
    const [selectedTx, setSelectedTx] = useState<EnrichedTransaction | null>(null);
    const { isPrivacyMode } = usePrivacy();
    const { assets, refresh, isLoading, isError } = useDashboard();
    const { history: allHistory } = useNetWorthHistory('all');

    const transactions = useMemo<EnrichedTransaction[]>(() => {
        const all: EnrichedTransaction[] = [];
        assets.forEach(asset => {
            asset.transactions?.forEach(txn => {
                all.push({ ...txn, assetName: asset.name, assetTicker: asset.ticker, category: asset.category, assetSource: asset.source, valueTwd: asset.value_twd });
            });
        });
        return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [assets]);

    const filteredTransactions = useMemo(() => {
        if (range === 'all') return transactions;
        const now = new Date();
        const limit = new Date();
        if (range === '30d') limit.setDate(now.getDate() - 30);
        else if (range === '3mo') limit.setMonth(now.getMonth() - 3);
        else if (range === '6mo') limit.setMonth(now.getMonth() - 6);
        else if (range === '1y') limit.setFullYear(now.getFullYear() - 1);
        return transactions.filter(txn => new Date(txn.date) >= limit);
    }, [transactions, range]);

    // Group all-time history by month, take the last entry per month
    const monthlySnapshots = useMemo(() => {
        const byMonth: Record<string, { value: number; date: string }> = {};
        allHistory.forEach(point => {
            const monthKey = point.date.slice(0, 7); // "YYYY-MM"
            if (!byMonth[monthKey] || point.date > byMonth[monthKey].date) {
                byMonth[monthKey] = { value: point.value, date: point.date };
            }
        });
        const sorted = Object.entries(byMonth)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([month, { value }], idx, arr) => {
                const prevValue = idx < arr.length - 1 ? arr[idx + 1][1].value : null;
                const change = prevValue !== null ? value - prevValue : null;
                const pct = prevValue && prevValue !== 0 ? ((value - prevValue) / Math.abs(prevValue)) * 100 : null;
                return { month, value, change, pct };
            });
        return sorted;
    }, [allHistory]);

    if (isLoading) return (
        <div className="mx-auto max-w-3xl px-4 py-8 space-y-4 animate-pulse">
            <div className="h-6 w-24 bg-muted rounded" />
            <div className="h-8 w-32 bg-muted rounded" />
            <div className="h-px bg-border" />
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted/50 rounded" />
            ))}
        </div>
    );

    if (isError) return <PageError onRetry={refresh} />;

    const handleRowClick = (txn: EnrichedTransaction) => {
        if (txn.assetSource !== 'max') setSelectedTx(txn);
    };

    const formatMoney = (n: number) =>
        isPrivacyMode ? '••••••' : `$${new Intl.NumberFormat('en-US').format(Math.round(n))}`;

    const formatChange = (n: number) =>
        isPrivacyMode ? '••••' : `${n >= 0 ? '+' : ''}$${new Intl.NumberFormat('en-US').format(Math.round(Math.abs(n)))}`;

    return (
        <div className="mx-auto max-w-3xl px-4 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">歷史紀錄</p>
                    <h1 className="font-display text-2xl font-medium tracking-tight">
                        {view === 'transactions' ? '所有交易' : '月結快照'}
                    </h1>
                </div>
                {/* View toggle */}
                <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1">
                    {(['transactions', 'monthly'] as View[]).map(v => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={cn(
                                'rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
                                view === v
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {v === 'transactions' ? '交易紀錄' : '月結快照'}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── 交易紀錄 ─────────────────────────────────── */}
            {view === 'transactions' && (
                <>
                    {/* Range selector */}
                    <div className="flex gap-3 mb-6">
                        {CHART_RANGES.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setRange(key)}
                                className={cn('text-xs font-medium transition-all duration-200 pb-px',
                                    range === key
                                        ? 'text-foreground border-b border-foreground/50'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {filteredTransactions.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-12 text-center">此區間無交易紀錄</p>
                    ) : (
                        <>
                            {/* Mobile list */}
                            <div className="md:hidden rounded-2xl border border-border bg-card divide-y divide-border/50">
                                {filteredTransactions.map((txn, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleRowClick(txn)}
                                        className={cn('px-4 py-3', txn.assetSource === 'max' ? 'cursor-default' : 'cursor-pointer hover:bg-muted/40 transition-colors')}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="text-sm font-medium text-foreground">{txn.assetName}</div>
                                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                                    {txn.date.slice(0, 10).replace(/-/g, '/')} · {CATEGORY_ZH[txn.category] ?? txn.category}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={cn('text-sm font-semibold tabular-nums', txn.amount >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                                                    {isPrivacyMode ? '••••' : (txn.amount > 0 ? '+' : '') + txn.amount.toLocaleString()}
                                                </div>
                                                <div className={cn('text-[11px] font-medium flex items-center justify-end gap-0.5 mt-0.5', txn.amount >= 0 ? 'text-emerald-600/70' : 'text-red-400/70')}>
                                                    {txn.amount >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                                                    {txn.category === 'Liabilities' ? (txn.amount > 0 ? '借入' : '償還') : (txn.amount >= 0 ? '買入' : '賣出')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop table */}
                            <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-border/60">
                                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">日期</th>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">資產</th>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">類型</th>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">變動</th>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">當時價格</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {filteredTransactions.map((txn, idx) => (
                                            <tr
                                                key={idx}
                                                onClick={() => handleRowClick(txn)}
                                                className={cn('transition-colors', txn.assetSource === 'max' ? 'cursor-default' : 'hover:bg-muted/40 cursor-pointer')}
                                            >
                                                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                                    {(() => {
                                                        const d = new Date(new Date(txn.date).getTime() + 8 * 3600000);
                                                        return `${d.getUTCFullYear()}/${d.getUTCMonth()+1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
                                                    })()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm font-medium text-foreground">{txn.assetName}</div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {CATEGORY_ZH[txn.category] ?? txn.category}
                                                        {txn.assetTicker ? ` · ${txn.assetTicker}` : ''}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={cn('flex items-center gap-1 text-xs font-medium w-fit', txn.amount >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                                                        {txn.amount >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                                                        {txn.category === 'Liabilities' ? (txn.amount > 0 ? '借入' : '償還') : (txn.amount >= 0 ? '買入' : '賣出')}
                                                    </span>
                                                </td>
                                                <td className={cn('px-4 py-3 text-right text-sm font-semibold tabular-nums', txn.amount >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                                                    {isPrivacyMode ? '••••' : (txn.amount > 0 ? '+' : '') + txn.amount.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                                                    {txn.buy_price > 0 ? `$${txn.buy_price}` : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </>
            )}

            {/* ── 月結快照 ─────────────────────────────────── */}
            {view === 'monthly' && (
                <>
                    {monthlySnapshots.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-12 text-center">尚無快照資料，新增資產並等待每日快照</p>
                    ) : (
                        <div className="rounded-2xl border border-border bg-card divide-y divide-border/50">
                            {monthlySnapshots.map(({ month, value, change, pct }) => {
                                const isUp = change !== null && change >= 0;
                                const [year, mo] = month.split('-');
                                return (
                                    <div key={month} className="flex items-center justify-between px-4 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                'flex h-7 w-7 items-center justify-center rounded-lg',
                                                change === null ? 'bg-muted' : isUp ? 'bg-trend-up-soft' : 'bg-trend-down-soft'
                                            )}>
                                                {change === null ? (
                                                    <span className="text-[10px] font-bold text-muted-foreground">—</span>
                                                ) : isUp ? (
                                                    <TrendingUp className="w-3.5 h-3.5 text-trend-up" />
                                                ) : (
                                                    <TrendingDown className="w-3.5 h-3.5 text-trend-down" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium">{year} 年 {mo} 月</div>
                                                {change !== null && (
                                                    <div className={cn('text-[11px] font-medium tabular-nums', isUp ? 'text-trend-up' : 'text-trend-down')}>
                                                        {formatChange(change)}
                                                        {pct !== null && ` (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)`}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="font-display text-[1.05rem] font-medium tabular-nums tracking-tight">
                                            {formatMoney(value)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            <TransactionEditDialog
                isOpen={!!selectedTx}
                onClose={() => setSelectedTx(null)}
                transaction={selectedTx}
                onSuccess={refresh}
            />
        </div>
    );
}
