'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePrivacy } from '@/components/PrivacyProvider';
import { useSetting } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Plus, Target, Link as LinkIcon, GripHorizontal } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_ZH, DASHBOARD_CATEGORY_ORDER } from '@/lib/constants';
import type { Goal, DashboardData } from '@/lib/types';

import {
    DndContext, closestCenter, PointerSensor, TouchSensor,
    useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { AssetAccordion } from './AssetAccordion';
import { AssetAllocationWidget } from './AssetAllocationWidget';
import { NetWorthTrendChart } from './NetWorthTrendChart';
import { TopPerformersWidget } from './TopPerformersWidget';
import { GoalWidget } from './GoalWidget';
import { AddAssetDialog } from './AddAssetDialog';
import { GoalDialog } from './GoalDialog';
import { IntegrationDialog } from './IntegrationDialog';

type SectionId = 'goals' | 'chart' | 'performers' | 'assets';
const DEFAULT_SECTION_ORDER: SectionId[] = ['goals', 'chart', 'performers', 'assets'];

function SortableSection({ id, children }: { id: SectionId; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={cn(isDragging && "opacity-50 z-50 relative")}
        >
            <div
                {...attributes}
                {...listeners}
                className="flex justify-center pb-2 cursor-grab active:cursor-grabbing touch-none select-none"
            >
                <GripHorizontal className="w-4 h-4 text-muted-foreground/20 hover:text-muted-foreground/50 transition-colors" />
            </div>
            {children}
        </div>
    );
}

interface DashboardClientProps {
    data: DashboardData;
}

export function DashboardClient({ data }: DashboardClientProps) {
    const { isPrivacyMode } = usePrivacy();

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
    const [assetView, setAssetView] = useState<'list' | 'chart'>('list');
    const [isIntegrationOpen, setIsIntegrationOpen] = useState(false);
    const [goalsRefreshTrigger, setGoalsRefreshTrigger] = useState(0);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [visibleCategories, setVisibleCategories] = useState<Record<string, boolean>>({});
    const [sectionOrder, setSectionOrder] = useState<SectionId[]>(DEFAULT_SECTION_ORDER);

    const { value: visibleCatsRaw } = useSetting('visible_categories');

    useEffect(() => {
        if (!visibleCatsRaw) {
            const cached = localStorage.getItem('setting_visible_categories');
            if (cached) {
                try { setVisibleCategories(JSON.parse(cached)); } catch { /* ignore */ }
            } else {
                const defaults: Record<string, boolean> = {};
                DASHBOARD_CATEGORY_ORDER.forEach(c => defaults[c] = true);
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

    useEffect(() => {
        const saved = localStorage.getItem('dashboard_section_order');
        if (saved) {
            try {
                const parsed: SectionId[] = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length === DEFAULT_SECTION_ORDER.length) {
                    setSectionOrder(parsed);
                }
            } catch { /* ignore */ }
        }
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    );

    function handleSectionDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        setSectionOrder(prev => {
            const next = arrayMove(prev, prev.indexOf(active.id as SectionId), prev.indexOf(over.id as SectionId));
            localStorage.setItem('dashboard_section_order', JSON.stringify(next));
            return next;
        });
    }

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

    const visibleOrder = DASHBOARD_CATEGORY_ORDER.filter(cat => visibleCategories[cat] !== false);

    const renderSection = (id: SectionId) => {
        switch (id) {
            case 'goals':
                return (
                    <GoalWidget
                        dashboardData={data}
                        refreshTrigger={goalsRefreshTrigger}
                        onEditGoal={(goal) => {
                            setEditingGoal(goal);
                            setIsGoalDialogOpen(true);
                        }}
                        onAddGoal={() => setIsGoalDialogOpen(true)}
                    />
                );
            case 'chart':
                return <NetWorthTrendChart />;
            case 'performers':
                return <TopPerformersWidget assets={assets} />;
            case 'assets':
                return (
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
                                            onTitleClick={undefined}
                                            onActionClick={category === 'Crypto' ? () => setIsIntegrationOpen(true) : undefined}
                                            actionIcon={<LinkIcon className="w-5 h-5" />}
                                            isEditMode={false}
                                            percentage={percentage}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </section>
                );
        }
    };

    return (
        <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">

            {/* ── Net Worth Hero — always first ──────────────── */}
            <section>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">淨資產</p>
                <p className="font-display text-[3.25rem] font-medium tracking-tight leading-none">
                    {isPrivacyMode ? '••••••' : `$${new Intl.NumberFormat('en-US').format(data.net_worth)}`}
                </p>
                <div className={cn(
                    'flex items-center gap-1.5 mt-3 text-sm font-medium',
                    data.total_pl >= 0 ? 'text-trend-up' : 'text-trend-down'
                )}>
                    {data.total_pl >= 0
                        ? <TrendingUp className="w-3.5 h-3.5" />
                        : <TrendingDown className="w-3.5 h-3.5" />}
                    {isPrivacyMode ? '••••' : `${data.total_pl >= 0 ? '+' : ''}$${new Intl.NumberFormat('en-US').format(Math.abs(data.total_pl))}`}
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

            {/* ── Sortable Sections ──────────────────────────── */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
                <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-8">
                        {sectionOrder.map(id => (
                            <SortableSection key={id} id={id}>
                                {renderSection(id)}
                            </SortableSection>
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

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
                    setGoalsRefreshTrigger(i => i + 1);
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
