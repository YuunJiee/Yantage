'use client';

import { useState, useMemo } from 'react';
import { usePrivacy } from "@/components/PrivacyProvider";
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from "@/lib/utils";
import type { Asset } from '@/lib/types';

interface TopPerformersWidgetProps {
    assets: Asset[];
}

export function TopPerformersWidget({ assets }: TopPerformersWidgetProps) {
    const { isPrivacyMode } = usePrivacy();
    const [mode, setMode] = useState<'Winners' | 'Losers'>('Winners');

    const sortedAssets = useMemo(() => {
        const candidates = assets.filter(a =>
            a.include_in_net_worth !== false &&
            (a.category === 'Stock' || a.category === 'Crypto') &&
            (a.roi !== undefined && a.roi !== 0)
        );
        if (mode === 'Winners') {
            return [...candidates].sort((a, b) => (b.unrealized_pl || 0) - (a.unrealized_pl || 0)).slice(0, 5);
        }
        return [...candidates].sort((a, b) => (a.unrealized_pl || 0) - (b.unrealized_pl || 0)).slice(0, 5);
    }, [assets, mode]);

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    表現排行
                </h2>
                <div className="flex gap-3">
                    <button
                        onClick={() => setMode('Winners')}
                        className={cn('flex items-center gap-1 text-xs font-medium transition-colors',
                            mode === 'Winners' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <TrendingUp className="w-3 h-3" /> 獲利
                    </button>
                    <button
                        onClick={() => setMode('Losers')}
                        className={cn('flex items-center gap-1 text-xs font-medium transition-colors',
                            mode === 'Losers' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <TrendingDown className="w-3 h-3" /> 虧損
                    </button>
                </div>
            </div>

            {sortedAssets.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">尚無資料</p>
            ) : (
                <div className="divide-y divide-border/50">
                    {sortedAssets.map((asset, index) => {
                        const pl = asset.unrealized_pl || 0;
                        const roi = asset.roi || 0;
                        const isPositive = pl >= 0;

                        return (
                            <div key={asset.id} className="flex items-center gap-3 py-2.5">
                                <span className="w-4 text-xs text-muted-foreground/60 tabular-nums shrink-0">{index + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-foreground truncate">{asset.name}</div>
                                    <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{asset.ticker}</div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className={cn('font-display text-[0.95rem] font-medium tabular-nums', isPositive ? 'text-trend-up' : 'text-trend-down')}>
                                        {isPrivacyMode ? '••••' : `${isPositive ? '+' : ''}$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(pl)}`}
                                    </div>
                                    <div className={cn('text-[11px] font-medium tabular-nums', isPositive ? 'text-trend-up/70' : 'text-trend-down/70')}>
                                        {roi.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
