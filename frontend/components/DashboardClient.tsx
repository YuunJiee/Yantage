'use client';

import { useState } from 'react';
import { useCategoryVisibility, useDashboard } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { Plus, Target, Link as LinkIcon } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_ZH, DASHBOARD_CATEGORY_ORDER, POSITIVE_CATEGORIES } from '@/lib/constants';
import type { Goal, DashboardData } from '@/lib/types';

import { NetWorthHero } from './dashboard/NetWorthHero';
import { SortableSections } from './dashboard/SortableSections';
import { AssetAccordion } from './AssetAccordion';
import { AssetAllocationWidget } from './AssetAllocationWidget';
import { NetWorthTrendChart } from './NetWorthTrendChart';
import { TopPerformersWidget } from './TopPerformersWidget';
import { GoalWidget } from './GoalWidget';
import { AddAssetDialog } from './AddAssetDialog';
import { GoalDialog } from './GoalDialog';
import { IntegrationDialog } from './IntegrationDialog';

interface DashboardClientProps {
    /** Server-rendered initial data — avoids a loading flash while SWR takes over for live updates. */
    data: DashboardData;
}

export function DashboardClient({ data: initialData }: DashboardClientProps) {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
    const [assetView, setAssetView] = useState<'list' | 'chart'>('list');
    const [isIntegrationOpen, setIsIntegrationOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const { visibility: visibleCategories } = useCategoryVisibility();
    const { dashboard } = useDashboard(initialData);
    const data = dashboard ?? initialData;

    const { assets } = data;

    const getCategoryTotal = (cat: string) =>
        assets
            .filter(a => a.category === cat && a.include_in_net_worth !== false)
            .reduce((sum, a) => {
                if (a.value_twd !== undefined) return sum + a.value_twd;
                const qty = a.transactions?.reduce((q, t) => q + t.amount, 0) ?? 0;
                return sum + (a.current_price ?? 0) * qty;
            }, 0);

    const totalPositiveAssets = POSITIVE_CATEGORIES
        .reduce((sum, cat) => sum + getCategoryTotal(cat), 0);

    const visibleOrder = DASHBOARD_CATEGORY_ORDER.filter(cat => visibleCategories[cat] !== false);

    return (
        <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">

            <NetWorthHero data={data} />

            {/* ── Sortable Sections ──────────────────────────── */}
            <SortableSections sections={[
                {
                    id: 'goals',
                    render: () => (
                        <GoalWidget
                            dashboardData={data}
                            onEditGoal={(goal) => {
                                setEditingGoal(goal);
                                setIsGoalDialogOpen(true);
                            }}
                            onAddGoal={() => setIsGoalDialogOpen(true)}
                        />
                    ),
                },
                { id: 'chart', render: () => <NetWorthTrendChart /> },
                { id: 'performers', render: () => <TopPerformersWidget assets={assets} /> },
                {
                    id: 'assets',
                    render: () => (
                        <section>
                            <div className="flex items-center justify-between px-1 mb-3">
                                <h2 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                                    資產明細
                                </h2>
                                <div className="flex gap-1 rounded-lg border border-border/60 bg-muted/40 p-0.5">
                                    {(['list', 'chart'] as const).map(v => (
                                        <button
                                            key={v}
                                            onClick={() => setAssetView(v)}
                                            className={cn(
                                                'rounded-md px-2.5 py-1 text-[11px] font-medium transition-all duration-200',
                                                assetView === v
                                                    ? 'bg-background text-foreground shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            )}
                                        >
                                            {v === 'list' ? '明細' : '配置'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {assetView === 'chart' ? (
                                <div className="rounded-2xl border border-border bg-card px-4 py-4">
                                    <AssetAllocationWidget assets={assets} />
                                </div>
                            ) : (
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
                                                title={CATEGORY_ZH[category] ?? category}
                                                totalAmount={catTotal}
                                                assets={assets}
                                                color={CATEGORY_COLORS[category] || 'bg-gray-500'}
                                                onActionClick={category === 'Crypto' ? () => setIsIntegrationOpen(true) : undefined}
                                                actionIcon={<LinkIcon className="w-5 h-5" />}
                                                percentage={percentage}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    ),
                },
            ]} />

            {/* ── Bottom Action Bar ──────────────────────────── */}
            <div className="flex gap-2.5 pt-2 pb-8">
                <button
                    onClick={() => setIsAddOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-foreground text-background py-3 text-sm font-medium hover:opacity-85 active:scale-[0.98] transition-all duration-150"
                >
                    <Plus className="w-4 h-4" /> 新增資產
                </button>
                <button
                    onClick={() => setIsGoalDialogOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-transparent px-4 py-3 text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-muted/60 active:scale-[0.98] transition-all duration-150"
                >
                    <Target className="w-4 h-4" />
                    目標
                </button>
            </div>

            {/* ── Dialogs ────────────────────────────────────── */}
            <AddAssetDialog
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                defaultCategory={undefined}
            />
            <GoalDialog
                isOpen={isGoalDialogOpen}
                onClose={() => {
                    setIsGoalDialogOpen(false);
                    setEditingGoal(null);
                }}
                initialGoal={editingGoal}
            />
            <IntegrationDialog
                isOpen={isIntegrationOpen}
                onClose={() => setIsIntegrationOpen(false)}
            />
        </div>
    );
}
