'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from "@/lib/utils";
import { usePrivacy } from "@/components/PrivacyProvider";
import { useNetWorthHistory } from '@/lib/hooks';

const RANGES = [
    { key: '30d', label: '30天' },
    { key: '3mo', label: '3個月' },
    { key: '6mo', label: '6個月' },
    { key: '1y', label: '1年' },
    { key: 'all', label: '全部' },
] as const;

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
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    淨值趨勢
                </h2>
                <div className="flex gap-3">
                    {RANGES.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setRange(key)}
                            className={cn(
                                'text-xs font-medium transition-colors',
                                range === key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
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
                                    <stop offset="5%" stopColor="#8ABF9E" stopOpacity={0.12} />
                                    <stop offset="95%" stopColor="#8ABF9E" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
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
                                contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '12px' }}
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
