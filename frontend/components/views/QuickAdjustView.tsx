'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createTransaction } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { MoneyInput } from '@/components/ui/MoneyInput';
import type { Asset } from '@/lib/types';

interface QuickAdjustViewProps {
    asset: Asset;
    onClose: () => void;
    onBack?: () => void;
}

export function QuickAdjustView({ asset, onClose, onBack }: QuickAdjustViewProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'set' | 'adjust'>('set');
    const [value, setValue] = useState('');

    const currentBalance = asset.transactions?.reduce((acc, t) => acc + t.amount, 0) ?? 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const amount = parseFloat(value);
            if (isNaN(amount)) return;
            const diff = mode === 'set' ? amount - currentBalance : amount;
            if (diff !== 0) {
                await createTransaction(asset.id, {
                    amount: diff,
                    buy_price: asset.current_price || 1,
                    date: new Date().toISOString()
                });
            }
            router.refresh();
            onClose();
            setValue('');
        } catch (error) {
            console.error("Failed to adjust balance", error);
        } finally {
            setLoading(false);
        }
    };

    const parsedValue = parseFloat(value);
    const resultBalance = !isNaN(parsedValue)
        ? (mode === 'set' ? parsedValue : currentBalance + parsedValue)
        : null;
    const diff = !isNaN(parsedValue)
        ? (mode === 'set' ? parsedValue - currentBalance : parsedValue)
        : null;

    return (
        <form onSubmit={handleSubmit} className="space-y-0">

            {/* ── 目前餘額 ────────────────────────────── */}
            <div className="pb-5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">目前餘額</p>
                <p className="font-display text-4xl font-medium tabular-nums">
                    ${currentBalance.toLocaleString()}
                </p>
            </div>

            {/* ── 調整方式 ────────────────────────────── */}
            <div className="border-t border-border/20 py-5 space-y-4">
                <div className="flex gap-1 rounded-xl border border-border/60 bg-muted/40 p-1 w-fit mx-auto">
                    {(['set', 'adjust'] as const).map(m => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => { setMode(m); setValue(''); }}
                            className={cn(
                                'rounded-lg px-4 py-1.5 text-xs font-medium transition-all duration-200',
                                mode === m
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {m === 'set' ? '設定為' : '增減'}
                        </button>
                    ))}
                </div>

                <div className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
                        {mode === 'set' ? '新餘額' : '增減金額'}
                    </p>
                    <MoneyInput
                        autoFocus
                        placeholder={mode === 'set' ? "例如：5000" : "例如：-200"}
                        className="tabular-nums text-xl h-12"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                    />
                    {diff !== null && (
                        <p className="text-[10px] text-muted-foreground text-right tabular-nums">
                            {mode === 'set'
                                ? `調整 ${diff >= 0 ? '+' : ''}${diff.toLocaleString()}`
                                : `新餘額 $${resultBalance?.toLocaleString()}`}
                        </p>
                    )}
                </div>
            </div>

            {/* ── 操作 ─────────────────────────────────── */}
            <div className="border-t border-border/20 pt-4 flex justify-between">
                {onBack && (
                    <Button type="button" variant="ghost" onClick={onBack} className="text-muted-foreground">
                        ← 返回
                    </Button>
                )}
                <Button type="submit" disabled={loading || !value} className="ml-auto">
                    {loading ? '確認中…' : '確認'}
                </Button>
            </div>
        </form>
    );
}
