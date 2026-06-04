'use client';

import { useRiskMetrics } from '@/lib/hooks';
import { cn } from '@/lib/utils';

export function RiskMetricsWidget() {
    const { metrics, isLoading: loading } = useRiskMetrics();

    if (loading) {
        return (
            <div className="grid grid-cols-3 gap-0 divide-x divide-border/40 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="px-4 first:pl-0 last:pr-0 space-y-1.5">
                        <div className="h-7 w-16 bg-muted rounded" />
                        <div className="h-3 w-12 bg-muted/60 rounded" />
                    </div>
                ))}
            </div>
        );
    }

    if (!metrics) return null;

    const STATUS_ZH: Record<string, string> = {
        Excellent: '極佳', Healthy: '穩健', Slow: '緩慢', Declining: '衰退',
        Safe: '安全', Correction: '回調', 'Heavy Loss': '重挫',
        Stable: '穩定', Moderate: '中等', 'High Risk': '高風險', 'N/A': '—'
    };

    const getColor = (metric: 'cagr' | 'dd' | 'vol', status: string) => {
        if (status === 'N/A') return 'text-muted-foreground';
        if (metric === 'cagr') return (status === 'Excellent' || status === 'Healthy') ? 'text-emerald-600' : status === 'Slow' ? 'text-amber-500' : 'text-red-500';
        if (metric === 'dd') return status === 'Safe' ? 'text-emerald-600' : status === 'Correction' ? 'text-amber-500' : 'text-red-500';
        if (metric === 'vol') return status === 'Stable' ? 'text-emerald-600' : status === 'Moderate' ? 'text-amber-500' : 'text-red-500';
        return 'text-muted-foreground';
    };

    const items = [
        {
            label: '年化報酬率',
            value: metrics.cagr.status === 'N/A' ? '--' : `${metrics.cagr.value.toFixed(1)}%`,
            status: STATUS_ZH[metrics.cagr.status] ?? metrics.cagr.status,
            color: getColor('cagr', metrics.cagr.status),
        },
        {
            label: '最大回撤',
            value: metrics.maxDrawdown.status === 'N/A' ? '--' : `-${metrics.maxDrawdown.value.toFixed(1)}%`,
            status: STATUS_ZH[metrics.maxDrawdown.status] ?? metrics.maxDrawdown.status,
            color: getColor('dd', metrics.maxDrawdown.status),
        },
        {
            label: '年化波動率',
            value: metrics.volatility.status === 'N/A' ? '--' : `${metrics.volatility.value.toFixed(1)}%`,
            status: STATUS_ZH[metrics.volatility.status] ?? metrics.volatility.status,
            color: getColor('vol', metrics.volatility.status),
        },
    ];

    return (
        <div className="grid grid-cols-3 divide-x divide-border/50">
            {items.map(({ label, value, status, color }) => (
                <div key={label} className="px-4 first:pl-0 last:pr-0">
                    <div className="font-display text-[1.6rem] font-medium tracking-tight tabular-nums leading-none">{value}</div>
                    <div className="text-[11px] text-muted-foreground mt-1.5 tracking-wide">{label}</div>
                    <div className={cn('text-[11px] font-medium mt-0.5', color)}>{status}</div>
                </div>
            ))}
        </div>
    );
}
