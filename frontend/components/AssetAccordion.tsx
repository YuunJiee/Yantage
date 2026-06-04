'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AssetActionDialog } from './AssetActionDialog';
import { usePrivacy } from "@/components/PrivacyProvider";
import { AssetIcon } from './IconPicker';
import { getCategoryIconName } from '@/lib/iconHelper';
import type { Asset, AssetGroup, Transaction } from '@/lib/types';

const SUBCATEGORY_ZH: Record<string, string> = {
    'Cash': '現金', 'E-Wallet': '電子錢包', 'Debit Card': '簽帳金融卡', 'Other': '其他',
    'Fund': '基金', 'Stock': '股票', 'TW Stock': '台股', 'US Stock': '美股',
    'Mutual Fund': '共同基金', 'Crypto': '加密貨幣', 'Token': '代幣', 'Coin': '幣',
    'Stablecoin': '穩定幣', 'DeFi': 'DeFi', 'NFT': 'NFT',
    'Other Investment': '其他投資', 'Real Estate': '房地產', 'Car': '車輛',
    'Other Fixed Asset': '其他固定資產', 'Credit Card': '信用卡',
    'Loan': '貸款', 'Payable': '應付帳款', 'Other Liability': '其他負債',
};

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
    onAddClick?: () => void;
    onTitleClick?: () => void;
    onActionClick?: () => void;
    actionIcon?: React.ReactNode;
    className?: string;
    isEditMode?: boolean;
    percentage?: number;
}

export function AssetAccordion({ category, title, totalAmount, assets, onAddClick, onTitleClick, onActionClick, actionIcon, className, isEditMode, percentage }: AssetAccordionProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [expandedWeb3Groups, setExpandedWeb3Groups] = useState<Record<string, boolean>>({});
    const { isPrivacyMode } = usePrivacy();

    const getTranslatedSubCategory = (sub: string) => SUBCATEGORY_ZH[sub] ?? sub;

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
                    totalValue: group.reduce((sum, a) => sum + (a.value_twd || ((a.current_price || 0) * (a.transactions?.reduce((acc, t) => acc + t.amount, 0) || 0))), 0),
                    last_updated_at: group.reduce((latest: string | null, a) => !latest || (a.last_updated_at && new Date(a.last_updated_at) > new Date(latest)) ? (a.last_updated_at ?? null) : latest, null),
                });
            } else {
                finalItems.push(group[0]);
            }
        });

        const getVal = (item: typeof finalItems[number]) =>
            item.isGroup
                ? item.totalValue
                : (item.value_twd || ((item.current_price || 0) * (item.transactions?.reduce((acc: number, t: { amount: number }) => acc + t.amount, 0) || 0)));
        return finalItems.sort((a, b) => getVal(b) - getVal(a));
    })();

    const toggleGroupExpand = (e: React.MouseEvent, key: string) => {
        e.stopPropagation();
        setExpandedWeb3Groups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: category,
        disabled: !isEditMode
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
    };

    const dot = CATEGORY_DOT[category] ?? 'bg-gray-400';

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(className, isDragging ? "opacity-50" : "")}
        >
            {/* ── Category Header Row ─────────────────────────── */}
            <div
                {...attributes}
                {...(isEditMode ? listeners : {})}
                onClick={() => { if (!isEditMode) toggleOpen(); }}
                className={cn(
                    "flex items-center gap-3 py-3 cursor-pointer select-none group",
                    isEditMode && "touch-none cursor-grab active:cursor-grabbing"
                )}
            >
                {isEditMode && <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />}

                {/* Color dot */}
                <div className={cn("w-2 h-2 rounded-full shrink-0", dot)} />

                {/* Title */}
                <h3
                    className={cn("text-sm font-semibold text-foreground flex items-center gap-1.5", onTitleClick ? "hover:underline cursor-pointer" : "")}
                    onClick={(e) => { if (onTitleClick) { e.stopPropagation(); onTitleClick(); } }}
                >
                    {title}
                    {onTitleClick && <ChevronRight className="w-3.5 h-3.5 opacity-40" />}
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
                    {onAddClick && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddClick(); }}
                            className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="新增資產"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {/* Total amount */}
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                        {isPrivacyMode ? '••••' : `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(totalAmount)}`}
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
                                                <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                                                    {item.icon ? (
                                                        <AssetIcon icon={item.icon} className="w-4 h-4" />
                                                    ) : (
                                                        <AssetIcon icon={getCategoryIconName(item.category, item.sub_category ?? undefined)} className="w-4 h-4" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{item.assets.length} 條鏈</span>
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground">Multi-Chain</div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-semibold tabular-nums">
                                                        {isPrivacyMode ? '••••' : `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(item.totalValue)}`}
                                                    </span>
                                                    <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground/50 transition-transform", isExpanded && "rotate-180")} />
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="pl-4 border-l border-border/40 ml-4 mb-1">
                                                    {item.assets.map((asset) => {
                                                        const value = (asset.value_twd !== undefined && asset.value_twd !== 0) ? asset.value_twd : ((asset.current_price || 0) * (asset.transactions?.reduce((acc: number, tx: Transaction) => acc + tx.amount, 0) || 0));
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
                                                                    {isPrivacyMode ? '••••' : `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`}
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
                                const value = (asset.value_twd !== undefined && asset.value_twd !== 0) ? asset.value_twd : ((asset.current_price || 0) * (asset.transactions?.reduce((acc: number, tx: Transaction) => acc + tx.amount, 0) || 0));

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
                                        <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                                            {asset.icon ? (
                                                <AssetIcon icon={asset.icon} className="w-4 h-4" />
                                            ) : (
                                                <AssetIcon icon={getCategoryIconName(asset.category, asset.sub_category ?? undefined)} className="w-4 h-4" />
                                            )}
                                        </div>

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
                                                        {asset.ticker || (asset.sub_category ? getTranslatedSubCategory(asset.sub_category) : '')}
                                                    </span>
                                                )}
                                                {asset.last_updated_at && (asset.ticker || asset.sub_category) && (
                                                    <span className="text-muted-foreground/40 text-[11px]">·</span>
                                                )}
                                                {asset.last_updated_at && (
                                                    <span className="text-[11px] text-muted-foreground/60">
                                                        {new Date(asset.last_updated_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
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
                                                {isPrivacyMode ? '••••' : `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`}
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
