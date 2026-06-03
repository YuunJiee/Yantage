'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePrivacy } from '@/components/PrivacyProvider';
import { useSetting } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Plus, ArrowRightLeft, Target, Link as LinkIcon } from 'lucide-react';
import { CATEGORY_COLORS } from '@/lib/constants';
import type { Goal, DashboardData } from '@/lib/types';

import { AssetAccordion } from './AssetAccordion';
import { AssetAllocationWidget } from './AssetAllocationWidget';
import { NetWorthTrendChart } from './NetWorthTrendChart';
import { RiskMetricsWidget } from './RiskMetricsWidget';
import { TopPerformersWidget } from './TopPerformersWidget';
import { GoalWidget } from './GoalWidget';
import { AddAssetDialog } from './AddAssetDialog';
import { GoalDialog } from './GoalDialog';
import { AssetActionDialog } from './AssetActionDialog';
import { IntegrationDialog } from './IntegrationDialog';

const CATEGORY_ORDER = ['Fluid', 'Stock', 'Crypto', 'Fixed', 'Receivables', 'Liabilities'] as const;
const CATEGORY_LABELS: Record<string, string> = {
    Fluid: '流動資產', Investment: '投資', Stock: '股票',
    Crypto: '加密貨幣', Fixed: '固定資產', Receivables: '應收帳款', Liabilities: '負債',
};

interface DashboardClientProps {
    data: DashboardData;
}

export function DashboardClient({ data }: DashboardClientProps) {
    const { isPrivacyMode } = usePrivacy();

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [addDefaultCategory, setAddDefaultCategory] = useState<string | undefined>(undefined);
    const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [isIntegrationOpen, setIsIntegrationOpen] = useState(false);
    const [goalsRefreshTrigger, setGoalsRefreshTrigger] = useState(0);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [visibleCategories, setVisibleCategories] = useState<Record<string, boolean>>({});

    const { value: visibleCatsRaw } = useSetting('visible_categories');

    useEffect(() => {
        if (!visibleCatsRaw) {
            const cached = localStorage.getItem('setting_visible_categories');
            if (cached) {
                try { setVisibleCategories(JSON.parse(cached)); } catch { /* ignore */ }
            } else {
                const defaults: Record<string, boolean> = {};
                CATEGORY_ORDER.forEach(c => defaults[c] = true);
                setVisibleCategories(defaults);
            }
            return;
        }
        try {
            const parsed = JSON.parse(visibleCatsRaw);
            setVisibleCategories(parsed);
            localStorage.setItem('setting_visible_categories', JSON.stringify(parsed));
        } catch { /* ignore malformed JSON */ }
    }, [visibleCatsRaw]);

    const { assets, updated_at } = data;
    const formattedTime = new Date(updated_at).toLocaleTimeString('zh-TW', {
        timeZone: 'Asia/Taipei', hour12: false,
    });

    const { diffDays, isStale } = useMemo(() => {
        // eslint-disable-next-line react-hooks/purity
        const ms = Date.now() - new Date(updated_at).getTime();
        const days = Math.ceil(Math.abs(ms) / (1000 * 60 * 60 * 24));
        return { diffDays: days, isStale: days > 5 };
    }, [updated_at]);

    const getCategoryTotal = (cat: string) =>
        assets
            .filter(a => a.category === cat && a.include_in_net_worth !== false)
            .reduce((sum, a) => {
                if (a.value_twd !== undefined) return sum + a.value_twd;
                const qty = a.transactions?.reduce((q, t) => q + t.amount, 0) ?? 0;
                return sum + (a.current_price ?? 0) * qty;
            }, 0);

    const totalPositiveAssets = ['Fluid', 'Stock', 'Crypto', 'Receivables']
        .reduce((sum, cat) => sum + getCategoryTotal(cat), 0);

    const visibleOrder = CATEGORY_ORDER.filter(cat => visibleCategories[cat] !== false);

    return (
        <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">

            {/* ── Net Worth Hero ─────────────────────────────── */}
            <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">淨值</p>
                <p className="text-4xl font-bold tracking-tight">
                    {isPrivacyMode ? '••••••' : `$${new Intl.NumberFormat('en-US').format(data.net_worth)}`}
                </p>
                <div className={cn(
                    'flex items-center gap-1.5 mt-1.5 text-sm font-medium',
                    data.total_pl >= 0 ? 'text-trend-up' : 'text-trend-down'
                )}>
                    {data.total_pl >= 0
                        ? <TrendingUp className="w-4 h-4" />
                        : <TrendingDown className="w-4 h-4" />}
                    {isPrivacyMode ? '••••' : `${data.total_pl >= 0 ? '+' : ''}$${new Intl.NumberFormat('en-US').format(Math.abs(data.total_pl))}`}
                    <span className="text-muted-foreground font-normal">
                        ({data.total_roi.toFixed(1)}%)
                    </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">最後更新：{formattedTime}</p>
            </section>

            {/* ── Stale Warning ──────────────────────────────── */}
            {isStale && (
                <div className="border-l-2 border-amber-400 pl-3 text-sm text-amber-700">
                    <p className="font-medium">儀表板已 {diffDays} 天未更新</p>
                    <p className="text-xs opacity-70 mt-0.5">記得補齊數據讓 FIRE 目標更清晰</p>
                </div>
            )}

            {/* ── Goal Progress ──────────────────────────────── */}
            <GoalWidget
                dashboardData={data}
                refreshTrigger={goalsRefreshTrigger}
                onEditGoal={(goal) => {
                    setEditingGoal(goal);
                    setIsGoalDialogOpen(true);
                }}
            />

            {/* ── Asset Allocation Pie ───────────────────────── */}
            <AssetAllocationWidget assets={assets} />

            {/* ── Net Worth Trend ────────────────────────────── */}
            <NetWorthTrendChart />

            {/* ── Risk Metrics ───────────────────────────────── */}
            <RiskMetricsWidget />

            {/* ── Top / Bottom Performers ────────────────────── */}
            <TopPerformersWidget assets={assets} />

            {/* ── Asset Accordions ───────────────────────────── */}
            <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-3">
                    資產明細
                </h2>
                <div className="rounded-2xl border border-border bg-card px-4 divide-y divide-border/50">
                    {visibleOrder.map(category => {
                        const catTotal = getCategoryTotal(category);
                        const percentage = totalPositiveAssets > 0
                            ? Math.round((catTotal / totalPositiveAssets) * 100)
                            : 0;
                        return (
                            <AssetAccordion
                                key={category}
                                category={category}
                                title={CATEGORY_LABELS[category] ?? category}
                                totalAmount={catTotal}
                                assets={assets}
                                color={CATEGORY_COLORS[category] || 'bg-gray-500'}
                                onAddClick={category === 'Crypto' ? undefined : () => {
                                    setAddDefaultCategory(category);
                                    setIsAddOpen(true);
                                }}
                                onTitleClick={undefined}
                                onActionClick={category === 'Crypto' ? () => setIsIntegrationOpen(true) : undefined}
                                actionIcon={<LinkIcon className="w-5 h-5" />}
                                isEditMode={false}
                                percentage={percentage}
                            />
                        );
                    })}
                </div>
            </section>

            {/* ── Bottom Action Bar ──────────────────────────── */}
            <div className="flex gap-3 pt-2 pb-8">
                <button
                    onClick={() => setIsAddOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-foreground text-background py-3 text-sm font-medium hover:opacity-90 transition-opacity"
                >
                    <Plus className="w-4 h-4" /> 新增資產
                </button>
                <button
                    onClick={() => setIsTransferOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 py-3 text-sm font-medium hover:bg-muted transition-colors"
                >
                    <ArrowRightLeft className="w-4 h-4" /> 轉移
                </button>
                <button
                    onClick={() => setIsGoalDialogOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 py-3 text-sm font-medium hover:bg-muted transition-colors"
                >
                    <Target className="w-4 h-4" /> 目標
                </button>
            </div>

            {/* ── Dialogs ────────────────────────────────────── */}
            <AddAssetDialog
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                defaultCategory={addDefaultCategory}
            />
            <GoalDialog
                isOpen={isGoalDialogOpen}
                onClose={() => {
                    setIsGoalDialogOpen(false);
                    setEditingGoal(null);
                    setGoalsRefreshTrigger(i => i + 1);
                }}
                initialGoal={editingGoal}
            />
            <AssetActionDialog
                isOpen={isTransferOpen}
                onClose={() => setIsTransferOpen(false)}
                asset={null}
                allAssets={assets}
                initialMode="transfer"
            />
            <IntegrationDialog
                isOpen={isIntegrationOpen}
                onClose={() => setIsIntegrationOpen(false)}
            />
        </div>
    );
}
