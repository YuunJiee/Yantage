'use client';

import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { usePrivacy } from "@/components/PrivacyProvider";
import { cn } from "@/lib/utils";
import type { Asset } from '@/lib/types';

const CHART_THEMES: Record<string, string[]> = {
    'Morandi': ['#A4C3B2', '#E0D5C3', '#D4A59A', '#8199A6', '#8ABF9E', '#C5AFA5'],
};

const SUBCATEGORY_ZH: Record<string, string> = {
    'Cash': '現金', 'E-Wallet': '電子錢包', 'Debit Card': '簽帳金融卡', 'Other': '其他',
    'Fund': '基金', 'Stock': '股票', 'TW Stock': '台股', 'US Stock': '美股',
    'Mutual Fund': '共同基金', 'Crypto': '加密貨幣', 'Token': '加密貨幣', 'Coin': '加密貨幣',
    'Stablecoin': '穩定幣', 'DeFi': 'DeFi', 'NFT': 'NFT',
    'Other Investment': '其他投資', 'Real Estate': '房地產', 'Car': '車輛',
    'Other Fixed Asset': '其他固定資產', 'Credit Card': '信用卡',
    'Loan': '貸款', 'Payable': '應付帳款', 'Other Liability': '其他負債',
};

const CATEGORY_ZH: Record<string, string> = {
    'Fluid': '流動資產', 'Investment': '投資', 'Stock': '股票',
    'Crypto': '加密貨幣', 'Fixed': '固定資產', 'Receivables': '應收帳款',
    'Liabilities': '負債', 'Total': '總計',
};

interface AssetAllocationWidgetProps {
    assets: Asset[];
}

export function AssetAllocationWidget({ assets }: AssetAllocationWidgetProps) {
    const { isPrivacyMode } = usePrivacy();
    const [viewMode, setViewMode] = useState<'Category' | 'SubCategory'>('Category');

    const data = useMemo(() => {
        const map = new Map<string, number>();
        assets.forEach(asset => {
            if (asset.include_in_net_worth === false) return;
            const key = viewMode === 'Category' ? (asset.category || 'Other') : (asset.sub_category || 'Other');
            const val = Number(asset.value_twd) || 0;
            map.set(key, (map.get(key) || 0) + val);
        });
        return Array.from(map.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .filter(item => item.value > 0);
    }, [assets, viewMode]);

    const totalValue = data.reduce((acc, curr) => acc + curr.value, 0);
    const legendHeight = Math.max(50, Math.ceil(data.length / 3) * 30 + 20);
    const containerHeight = Math.min(Math.max(420, 360 + legendHeight), 700);
    const colors = CHART_THEMES['Morandi'];

    const getTranslatedName = (name: string) =>
        viewMode === 'SubCategory' ? (SUBCATEGORY_ZH[name] ?? name) : (CATEGORY_ZH[name] ?? name);

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    資產配置
                </h2>
                <div className="flex gap-3">
                    {(['Category', 'SubCategory'] as const).map(m => (
                        <button
                            key={m}
                            onClick={() => setViewMode(m)}
                            className={cn('text-xs font-medium transition-colors',
                                viewMode === m ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {m === 'Category' ? '類別' : '子類別'}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ width: '100%', height: containerHeight, minHeight: containerHeight, overflow: 'hidden' }}>
                {totalValue === 0 ? (
                    <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                        尚無資料
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                        <PieChart margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="45%"
                                innerRadius={95}
                                outerRadius={130}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {data.map((entry, index) => {
                                    let fillColor = colors[index % colors.length];
                                    if (viewMode === 'Category') {
                                        const semanticMap: Record<string, string> = {
                                            'Fluid': 'var(--color-fluid)',
                                            'Stock': 'var(--color-stock)',
                                            'Crypto': 'var(--color-crypto)',
                                            'Fixed': 'var(--color-fixed)',
                                            'Receivables': 'var(--color-receivables)',
                                            'Liabilities': 'var(--color-liabilities)'
                                        };
                                        const semantic = semanticMap[entry.name];
                                        if (semantic) fillColor = semantic;
                                    }
                                    return (
                                        <Cell key={`cell-${index}`} fill={fillColor} stroke="var(--background)" strokeWidth={2} />
                                    );
                                })}
                            </Pie>
                            <Tooltip
                                formatter={(value, name) => {
                                    if (isPrivacyMode) return ['••••', getTranslatedName(String(name ?? ''))];
                                    const v = Number(value ?? 0);
                                    const percent = totalValue ? (v / totalValue * 100).toFixed(1) : 0;
                                    return [
                                        `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v)} (${percent}%)`,
                                        getTranslatedName(String(name ?? ''))
                                    ];
                                }}
                                contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '12px' }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={legendHeight}
                                iconType="circle"
                                layout="horizontal"
                                align="center"
                                wrapperStyle={{ paddingTop: '20px' }}
                                formatter={(value) => (
                                    <span className="mr-2 text-muted-foreground text-xs font-medium">{getTranslatedName(value)}</span>
                                )}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
