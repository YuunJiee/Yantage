'use client';

import { useState, useMemo } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { usePrivacy } from "@/components/PrivacyProvider";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/lib/hooks";
import type { Asset, Transaction } from "@/lib/types";
import { TransactionEditDialog } from "@/components/TransactionEditDialog";
import { PageError } from "@/components/ui/skeleton";

interface EnrichedTransaction extends Transaction {
    assetName: string;
    assetTicker?: string | null;
    category: Asset['category'];
    assetSource?: string;
    valueTwd?: number;
}

const CATEGORY_LABELS: Record<string, string> = {
    Fluid: '流動資產', Investment: '投資', Stock: '股票', Crypto: '加密貨幣',
    Fixed: '固定資產', Receivables: '應收帳款', Liabilities: '負債',
};

const RANGES = [
    { key: '30d', label: '30天' },
    { key: '3mo', label: '3個月' },
    { key: '6mo', label: '6個月' },
    { key: '1y', label: '1年' },
    { key: 'all', label: '全部' },
] as const;

export default function HistoryPage() {
    const [range, setRange] = useState<string>('all');
    const [selectedTx, setSelectedTx] = useState<EnrichedTransaction | null>(null);
    const { isPrivacyMode } = usePrivacy();
    const { assets, refresh, isLoading, isError } = useDashboard();

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

    return (
        <div className="mx-auto max-w-3xl px-4 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">歷史紀錄</p>
                    <h1 className="text-2xl font-bold tracking-tight">所有交易</h1>
                </div>
                <div className="flex gap-3">
                    {RANGES.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setRange(key)}
                            className={cn('text-xs font-medium transition-colors',
                                range === key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
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
                                            {new Date(txn.date).toLocaleDateString('zh-TW')} · {CATEGORY_LABELS[txn.category] ?? txn.category}
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
                                            {new Date(txn.date).toLocaleString('zh-TW', { hour12: false, timeZone: 'Asia/Taipei' })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-foreground">{txn.assetName}</div>
                                            <div className="text-[11px] text-muted-foreground">
                                                {CATEGORY_LABELS[txn.category] ?? txn.category}
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

            <TransactionEditDialog
                isOpen={!!selectedTx}
                onClose={() => setSelectedTx(null)}
                transaction={selectedTx}
                onSuccess={refresh}
            />
        </div>
    );
}
