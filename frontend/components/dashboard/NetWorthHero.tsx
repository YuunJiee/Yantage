'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { usePrivacy } from '@/components/PrivacyProvider';
import { usePrivateMoney } from '@/lib/usePrivateMoney';
import { cn, formatMoney } from '@/lib/utils';
import type { DashboardData } from '@/lib/types';

export function NetWorthHero({ data }: { data: DashboardData }) {
    const { isPrivacyMode } = usePrivacy();
    const privateMoney = usePrivateMoney();

    const formattedTime = new Date(data.updated_at).toLocaleTimeString('zh-TW', {
        timeZone: 'Asia/Taipei', hour12: false,
    });

    const { diffDays, isStale } = useMemo(() => {
        // eslint-disable-next-line react-hooks/purity
        const ms = Date.now() - new Date(data.updated_at).getTime();
        const days = Math.ceil(Math.abs(ms) / (1000 * 60 * 60 * 24));
        return { diffDays: days, isStale: days > 5 };
    }, [data.updated_at]);

    return (
        <>
            {/* ── Net Worth Hero — always first ──────────────── */}
            <section>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">淨資產</p>
                <p className="font-display text-[3.25rem] font-medium tracking-tight leading-none">
                    {privateMoney(data.net_worth, '••••••')}
                </p>
                <div className={cn(
                    'flex items-center gap-1.5 mt-3 text-sm font-medium',
                    data.total_pl >= 0 ? 'text-trend-up' : 'text-trend-down'
                )}>
                    {data.total_pl >= 0
                        ? <TrendingUp className="w-3.5 h-3.5" />
                        : <TrendingDown className="w-3.5 h-3.5" />}
                    {isPrivacyMode ? '••••' : `${data.total_pl >= 0 ? '+' : ''}${formatMoney(Math.abs(data.total_pl))}`}
                    <span className="text-muted-foreground font-normal">
                        ({data.total_roi.toFixed(1)}%)
                    </span>
                </div>
                <p className="text-[11px] text-muted-foreground/60 mt-2 tracking-wide">更新於 {formattedTime}</p>
            </section>

            {/* ── Stale Warning ──────────────────────────────── */}
            {isStale && (
                <div className="border-l-2 border-amber-400 pl-3 text-sm text-amber-700">
                    <p className="font-medium">儀表板已 {diffDays} 天未更新</p>
                    <p className="text-xs opacity-70 mt-0.5">記得補齊數據讓 FIRE 目標更清晰</p>
                </div>
            )}
        </>
    );
}
