'use client';

import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrivateMoney } from '@/lib/usePrivateMoney';
import { AssetActionDialog } from './AssetActionDialog';
import { AssetRowIcon } from './AssetAccordion/AssetRowIcon';
import { getAssetDisplayValue } from './AssetAccordion/helpers';
import { getSubCategoryLabel } from '@/lib/constants';
import type { Asset, AssetGroup } from '@/lib/types';

const CATEGORY_DOT: Record<string, string> = {
    Fluid: 'bg-emerald-400',
    Crypto: 'bg-orange-400',
    Stock: 'bg-indigo-500',
    Fixed: 'bg-blue-400',
    Receivables: 'bg-amber-400',
    Liabilities: 'bg-red-400',
};

interface AssetAccordionProps {
    category: string;
    title: string;
    totalAmount: number;
    assets: Asset[];
    color: string;
    onActionClick?: () => void;
    actionIcon?: React.ReactNode;
    percentage?: number;
}

export function AssetAccordion({ category, title, totalAmount, assets, onActionClick, actionIcon, percentage }: AssetAccordionProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [expandedWeb3Groups, setExpandedWeb3Groups] = useState<Record<string, boolean>>({});
    const privateMoney = usePrivateMoney();

    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [dialogMode, setDialogMode] = useState<'history' | 'edit' | 'adjust'>('history');

    useEffect(() => {
        const saved = localStorage.getItem(`accordion_open_${category}`);
        if (saved !== null) setIsOpen(saved === 'true');
        const t = setTimeout(() => setIsMounted(true), 100);
        return () => clearTimeout(t);
    }, [category]);

    const toggleOpen = () => {
        const newState = !isOpen;
        setIsOpen(newState);
        localStorage.setItem(`accordion_open_${category}`, String(newState));
    };

    const handleCardClick = (asset: Asset) => {
        setSelectedAsset(asset);
        setDialogMode('history');
    };

    const handleCloseDialogs = () => setSelectedAsset(null);

    const categoryAssets = assets.filter(a => a.category === category);

    const groupedAssets = (() => {
        const web3Groups: Record<string, Asset[]> = {};
        const others: Asset[] = [];

        categoryAssets.forEach(asset => {
            if (asset.source === 'web3_wallet') {
                const key = asset.ticker || asset.name;
                if (!web3Groups[key]) web3Groups[key] = [];
                web3Groups[key].push(asset);
            } else {
                others.push(asset);
            }
        });

        const finalItems: (Asset | AssetGroup)[] = [...others];
        Object.entries(web3Groups).forEach(([key, group]) => {
            if (group.length > 1) {
                finalItems.push({
                    isGroup: true,
                    groupKey: key,
                    assets: group,
                    name: group[0].name.split(' (')[0] || group[0].name,
                    ticker: group[0].ticker,
                    icon: group[0].icon,
                    category: group[0].category,
                    sub_category: group[0].sub_category,
                    totalValue: group.reduce((sum, a) => sum + getAssetDisplayValue(a), 0),
                    last_updated_at: group.reduce((latest: string | null, a) => !latest || (a.last_updated_at && new Date(a.last_updated_at) > new Date(latest)) ? (a.last_updated_at ?? null) : latest, null),
                });
            } else {
                finalItems.push(group[0]);
            }
        });

        const getVal = (item: typeof finalItems[number]) =>
            item.isGroup ? item.totalValue : getAssetDisplayValue(item);
        return finalItems.sort((a, b) => getVal(b) - getVal(a));
    })();

    const toggleGroupExpand = (e: React.MouseEvent, key: string) => {
        e.stopPropagation();
        setExpandedWeb3Groups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const dot = CATEGORY_DOT[category] ?? 'bg-gray-400';

    return (
        <div>
            {/* ── Category Header Row ─────────────────────────── */}
            <div
                onClick={toggleOpen}
                className="flex items-center gap-3 py-3 cursor-pointer select-none group"
            >
                {/* Color dot */}
                <div className={cn("w-2 h-2 rounded-full shrink-0", dot)} />

                {/* Title */}
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    {title}
                </h3>

                {/* Allocation % */}
                {percentage !== undefined && percentage > 0 && (
                    <span className="text-[11px] text-muted-foreground/70 font-medium tabular-nums">{percentage}%</span>
                )}

                {/* Right side */}
                <div className="ml-auto flex items-center gap-2">
                    {/* Quick actions */}
                    {onActionClick && actionIcon && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onActionClick(); }}
                            className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="Action"
                        >
                            <span className="w-3.5 h-3.5 block [&>svg]:w-3.5 [&>svg]:h-3.5">{actionIcon}</span>
                        </button>
                    )}
                    {/* Total amount */}
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                        {privateMoney(totalAmount, '••••', { minimumFractionDigits: 0 })}
                    </span>

                    {/* Chevron */}
                    <ChevronDown className={cn(
                        "w-4 h-4 text-muted-foreground/60 transition-transform duration-200",
                        isMounted && "transition-transform",
                        isOpen ? "rotate-180" : "rotate-0"
                    )} />
                </div>
            </div>


            {/* ── Asset List ─────────────────────────────────── */}
            <div className={cn(
                "grid",
                isMounted && "transition-all duration-200 ease-in-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}>
                <div className="overflow-hidden">
                    {categoryAssets.length === 0 ? (
                        <div className="py-4 px-1 text-sm text-muted-foreground">尚無資產</div>
                    ) : (
                        <div>
                            {groupedAssets.map(item => {
                                if (item.isGroup) {
                                    const isExpanded = expandedWeb3Groups[item.groupKey];
                                    return (
                                        <div key={item.groupKey}>
                                            <div
                                                onClick={(e) => toggleGroupExpand(e, item.groupKey)}
                                                className="flex items-center gap-3 py-3 cursor-pointer hover:bg-muted/40 rounded-lg px-1 -mx-1 transition-colors"
                                            >
                                                <AssetRowIcon icon={item.icon} category={item.category} subCategory={item.sub_category} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{item.assets.length} 條鏈</span>
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground">Multi-Chain</div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-semibold tabular-nums">
                                                        {privateMoney(item.totalValue, '••••', { maximumFractionDigits: 0 })}
                                                    </span>
                                                    <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground/50 transition-transform", isExpanded && "rotate-180")} />
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="pl-4 border-l border-border/40 ml-4 mb-1">
                                                    {item.assets.map((asset) => {
                                                        const value = getAssetDisplayValue(asset);
                                                        return (
                                                            <div
                                                                key={asset.id}
                                                                onClick={() => handleCardClick(asset)}
                                                                className="flex items-center justify-between py-2.5 cursor-pointer hover:bg-muted/40 rounded-lg px-2 -mx-2 transition-colors"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase w-8 text-center">{asset.network?.substring(0, 3)}</span>
                                                                    <span className="text-xs font-medium">{asset.network}</span>
                                                                </div>
                                                                <span className="text-xs font-semibold tabular-nums">
                                                                    {privateMoney(value, '••••', { maximumFractionDigits: 0 })}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            <div className="h-px bg-border/40" />
                                        </div>
                                    );
                                }

                                const asset = item;
                                const value = getAssetDisplayValue(asset);

                                return (
                                    <div
                                        key={asset.id}
                                        onClick={() => handleCardClick(asset)}
                                        className={cn(
                                            "flex items-center gap-3 py-3 cursor-pointer hover:bg-muted/40 rounded-lg px-1 -mx-1 transition-colors group/row",
                                            asset.include_in_net_worth === false && "opacity-50"
                                        )}
                                    >
                                        {/* Icon */}
                                        <AssetRowIcon icon={asset.icon} category={asset.category} subCategory={asset.sub_category} />

                                        {/* Name + meta */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-medium text-foreground truncate">{asset.name}</span>
                                                {asset.include_in_net_worth === false && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">不計入</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                {(asset.ticker || asset.sub_category) && (
                                                    <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
                                                        {asset.ticker || (asset.sub_category ? getSubCategoryLabel(asset.sub_category) : '')}
                                                    </span>
                                                )}
                                                {asset.last_updated_at && (asset.ticker || asset.sub_category) && (
                                                    <span className="text-muted-foreground/40 text-[11px]">·</span>
                                                )}
                                                {asset.last_updated_at && (
                                                    <span className="text-[11px] text-muted-foreground/60">
                                                        {asset.last_updated_at.slice(5, 10).replace('-', '/')}
                                                    </span>
                                                )}
                                                {asset.category === 'Liabilities' && asset.payment_due_day && (
                                                    <span className="text-[11px] text-muted-foreground/80">每月 {asset.payment_due_day} 日</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right side: favorite + amount */}
                                        <div className="text-right shrink-0">
                                            <div className="text-sm font-semibold text-foreground tabular-nums">
                                                {privateMoney(value, '••••', { maximumFractionDigits: 0 })}
                                            </div>
                                            {totalAmount > 0 && asset.include_in_net_worth !== false && (
                                                <div className="text-[11px] text-muted-foreground/60 tabular-nums">
                                                    {Math.round((value / totalAmount) * 100)}%
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {/* Bottom spacing inside expanded section */}
                    <div className="pb-2" />
                </div>
            </div>

            {selectedAsset && (
                <AssetActionDialog
                    isOpen={!!selectedAsset}
                    onClose={handleCloseDialogs}
                    asset={selectedAsset}
                    initialMode={dialogMode}
                />
            )}
        </div>
    );
}
