'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createTransaction } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
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

    const currentBalance = asset ? asset.transactions?.reduce((acc: number, t) => acc + t.amount, 0) ?? 0 : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const amount = parseFloat(value);
            if (isNaN(amount)) return;

            let diff = 0;
            if (mode === 'set') {
                diff = amount - currentBalance;
            } else {
                diff = amount; // Adjust mode assumes + or - value input
            }

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

    // Reset when asset changes
    // mode and value state are local, should reset if asset changes essentially.

    return (
        <div>
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Mode Toggle */}
                <div className="flex gap-4 border-b border-border/50 pb-3">
                    <button
                        type="button"
                        className={`text-sm font-medium transition-colors pb-0.5 ${mode === 'set' ? 'text-foreground border-b-2 border-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => { setMode('set'); setValue(''); }}
                    >
                        設定最終餘額
                    </button>
                    <button
                        type="button"
                        className={`text-sm font-medium transition-colors pb-0.5 ${mode === 'adjust' ? 'text-foreground border-b-2 border-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => { setMode('adjust'); setValue(''); }}
                    >
                        增減金額 (+/-)
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="text-center">
                        <div className="text-sm text-muted-foreground mb-1">目前餘額</div>
                        <div className="text-3xl font-bold font-mono">${currentBalance.toLocaleString()}</div>
                    </div>

                    <div className="space-y-2">
                        <Label>
                            {mode === 'set' ? '新餘額' : '增減金額'}
                        </Label>
                        <MoneyInput
                            autoFocus
                            placeholder={mode === 'set' ? "e.g. 5000" : "e.g. -200"}
                            className="font-mono text-xl h-12"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                        />
                        {mode === 'set' && value && !isNaN(parseFloat(value)) && (
                            <div className="text-xs text-muted-foreground text-right">
                                Adjustment: {parseFloat(value) - currentBalance > 0 ? '+' : ''}
                                {(parseFloat(value) - currentBalance).toLocaleString()}
                            </div>
                        )}
                        {mode === 'adjust' && value && !isNaN(parseFloat(value)) && (
                            <div className="text-xs text-muted-foreground text-right">
                                New Balance: ${(currentBalance + parseFloat(value)).toLocaleString()}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-between pt-2">
                    {onBack && (
                        <Button type="button" variant="ghost" onClick={onBack}>
                            <ArrowLeft className="w-4 h-4 mr-1" /> 返回
                        </Button>
                    )}
                    <div className="flex gap-2 ml-auto">
                        {/* <Button type="button" variant="ghost" onClick={onClose}>{t('cancel')}</Button> */}
                        <Button type="submit" disabled={loading || !value}>
                            {loading ? '載入中...' : '確認'}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
