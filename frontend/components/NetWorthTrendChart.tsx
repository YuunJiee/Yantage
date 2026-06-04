'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from "@/lib/utils";
import { usePrivacy } from "@/components/PrivacyProvider";
import { useNetWorthHistory } from '@/lib/hooks';
import { CHART_RANGES } from '@/lib/constants';

interface NetWorthTrendChartProps {
    className?: string;
}

export function NetWorthTrendChart({ className }: NetWorthTrendChartProps) {
    const { isPrivacyMode } = usePrivacy();
    const [range, setRange] = useState<string>('30d');
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const { history: data, isLoading } = useNetWorthHistory(range);

    if (!mounted) return <div className={cn("h-[320px]", className)} />;

    return (
        <div className={className}>
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    淨值趨勢
                </h2>
                <div className="flex gap-3">
                    {CHART_RANGES.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setRange(key)}
                            className={cn(
                                'text-xs font-medium transition-all duration-200 pb-px',
                                range === key
                                    ? 'text-foreground border-b border-foreground/50'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-[300px] w-full min-w-0 overflow-hidden">
                {isLoading ? (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">載入中…</div>
                ) : data.length === 0 ? (
                    <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground gap-1.5">
                        <p className="text-sm">尚無資料</p>
                        <p className="text-xs opacity-60">新增資產以查看趨勢</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#8ABF9E" stopOpacity={0.18} />
                                    <stop offset="100%" stopColor="#8ABF9E" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="2 4" stroke="var(--border)" strokeOpacity={0.6} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                                tickFormatter={(str) => {
                                    const d = new Date(str);
                                    return `${d.getMonth() + 1}/${d.getDate()}`;
                                }}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                                tickFormatter={(val) =>
                                    isPrivacyMode ? '••••' : '$' + new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 0 }).format(val)
                                }
                                domain={['auto', 'auto']}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: '11px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
                                formatter={(value: number | undefined) =>
                                    isPrivacyMode ? '••••' : '$' + new Intl.NumberFormat('en-US').format(value ?? 0)
                                }
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#8ABF9E"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
