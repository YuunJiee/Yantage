'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';
import { usePrivacy } from "@/components/PrivacyProvider";
import { usePrivateMoney } from '@/lib/usePrivateMoney';
import { cn, formatMoney } from '@/lib/utils';
import { createBudgetCategory, updateBudgetCategory, deleteBudgetCategory } from '@/lib/api';
import { useBudgetCategories, useIncomeItems, useDashboard } from '@/lib/hooks';
import { useFormSubmit } from '@/lib/useFormSubmit';
import { useToast } from '@/components/ui/toast';
import { AssetIcon } from '@/components/IconPicker';
import { IncomeItemDialog } from '@/components/budget/IncomeItemDialog';
import { PageError } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { BudgetCategory, IncomeItem } from '@/lib/types';
import {
    getColors, MACRO_GROUPS, GROUP_ZH,
    DEFICIT_WARNING_THRESHOLD, INVESTMENT_RATIO_HEALTHY_THRESHOLD, EMERGENCY_FUND_TARGET_MONTHS,
} from '@/components/budget/constants';
import {
    computeTotalIncome,
    computeTotalBudget,
    computeInvestmentRatio,
    computeEmergencyFund,
    groupBudgetsByMacroGroup,
} from '@/components/budget/budgetMetrics';
import { BudgetCategoryFormSheet, type BudgetFormState } from '@/components/budget/BudgetCategoryFormSheet';

export default function BudgetPage() {
    const { toast } = useToast();
    const { isPrivacyMode } = usePrivacy();
    const privateMoney = usePrivateMoney();
    const {
        categories, refresh: refreshBudgets,
        isLoading: budgetsLoading, isError: budgetsError,
    } = useBudgetCategories();
    const {
        incomeItems, refresh: refreshIncome,
        isLoading: incomeLoading, isError: incomeError,
    } = useIncomeItems();
    const {
        dashboard, isLoading: dashboardLoading, isError: dashboardError,
        refresh: refreshDashboard,
    } = useDashboard();

    const isLoading = budgetsLoading || incomeLoading || dashboardLoading;
    const isError = budgetsError || incomeError || dashboardError;
    const refreshAll = () => { refreshBudgets(); refreshIncome(); refreshDashboard(); };

    const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
    const [confirmBudgetDelete, setConfirmBudgetDelete] = useState(false);
    const [editingBudgetId, setEditingBudgetId] = useState<number | null>(null);
    const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
    const [editingIncomeItem, setEditingIncomeItem] = useState<IncomeItem | null>(null);

    const defaultBudgetForm: BudgetFormState = { name: '', icon: '', budget_amount: '', color: 'emerald', note: '', group_name: 'Unassigned' };
    const [budgetForm, setBudgetForm] = useState<BudgetFormState>(defaultBudgetForm);

    const openAddBudget = () => { setEditingBudgetId(null); setBudgetForm(defaultBudgetForm); setIsBudgetDialogOpen(true); };
    const openEditBudget = (cat: BudgetCategory) => {
        setEditingBudgetId(cat.id);
        setBudgetForm({ name: cat.name, icon: cat.icon ?? '', budget_amount: cat.budget_amount.toString(), color: cat.color ?? 'emerald', note: cat.note ?? '', group_name: cat.group_name || 'Unassigned' });
        setIsBudgetDialogOpen(true);
    };

    const { submit: submitBudget, loading: savingBudget, error: budgetSaveError } = useFormSubmit(async () => {
        const payload = { name: budgetForm.name, icon: budgetForm.icon || null, budget_amount: parseFloat(budgetForm.budget_amount), color: budgetForm.color || null, note: budgetForm.note || null, group_name: budgetForm.group_name || 'Unassigned' };
        if (editingBudgetId) {
            await updateBudgetCategory(editingBudgetId, payload);
        } else {
            await createBudgetCategory(payload);
        }
        setIsBudgetDialogOpen(false);
        refreshBudgets();
    });
    const handleBudgetSubmit = (e: React.FormEvent) => { e.preventDefault(); submitBudget(); };

    const { submit: submitBudgetDelete, loading: deletingBudget, error: budgetDeleteError } = useFormSubmit(async () => {
        if (!editingBudgetId) return;
        await deleteBudgetCategory(editingBudgetId);
        setIsBudgetDialogOpen(false);
        setConfirmBudgetDelete(false);
        refreshBudgets();
    });
    const handleBudgetDelete = () => submitBudgetDelete();

    useEffect(() => {
        if (budgetSaveError) toast(editingBudgetId ? '更新類別失敗' : '新增類別失敗', 'error');
    }, [budgetSaveError]);

    useEffect(() => {
        if (budgetDeleteError) toast('刪除類別失敗', 'error');
    }, [budgetDeleteError]);

    // Metrics
    const totalIncome = computeTotalIncome(incomeItems);
    const totalBudget = computeTotalBudget(categories);
    const deficit = totalIncome - totalBudget;
    const investmentRatio = computeInvestmentRatio(categories, totalIncome);
    const { fluidAssetsTotal, target: emergencyFundTarget, progress: emergencyFundProgress } =
        computeEmergencyFund(categories, dashboard?.assets ?? []);

    const deficitStatus = deficit > 0
        ? { icon: ShieldCheck, color: 'text-emerald-600', label: '安全 · 可儲蓄' }
        : deficit > DEFICIT_WARNING_THRESHOLD
            ? { icon: AlertTriangle, color: 'text-amber-500', label: '小赤字 · 警告' }
            : { icon: AlertCircle, color: 'text-red-500', label: '大赤字 · 危險' };
    const DeficitIcon = deficitStatus.icon;

    const groupedBudgets = groupBudgetsByMacroGroup(categories);

    if (isLoading) return (
        <div className="mx-auto max-w-5xl px-4 py-8 space-y-6 animate-pulse">
            <div className="h-6 w-24 bg-muted rounded" />
            <div className="h-8 w-32 bg-muted rounded" />
            <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl" />)}</div>
        </div>
    );

    if (isError) return <PageError onRetry={refreshAll} />;

    return (
        <div className="mx-auto max-w-5xl px-4 py-8 pb-24">

            {/* Header */}
            <div className="mb-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">財務規劃</p>
                <h1 className="font-display text-2xl font-medium tracking-tight">預算規劃</h1>
            </div>

            {/* ── 差額概覽 ─────────────────────────────── */}
            <section className="mb-8">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-4">本月差額</h2>

                {/* Main diff row */}
                <div className="grid grid-cols-3 divide-x divide-border/50 mb-6">
                    <div className="pr-6">
                        <div className="text-[11px] text-muted-foreground mb-1.5">總收入</div>
                        <div className="font-display text-2xl font-medium tabular-nums leading-none">
                            {privateMoney(totalIncome)}
                        </div>
                    </div>
                    <div className="px-6">
                        <div className="text-[11px] text-muted-foreground mb-1.5">總預算</div>
                        <div className="font-display text-2xl font-medium tabular-nums leading-none">
                            {privateMoney(totalBudget)}
                        </div>
                    </div>
                    <div className="pl-6">
                        <div className={cn('flex items-center gap-1.5 text-[11px] font-medium mb-1.5', deficitStatus.color)}>
                            <DeficitIcon className="w-3.5 h-3.5" />
                            {deficitStatus.label}
                        </div>
                        <div className={cn('font-display text-2xl font-medium tabular-nums leading-none', deficitStatus.color)}>
                            {privateMoney(Math.abs(deficit))}
                        </div>
                    </div>
                </div>

                {/* Secondary metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-border bg-card px-4 py-3">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-muted-foreground">緊急預備金（{EMERGENCY_FUND_TARGET_MONTHS} 個月）</span>
                            <span className="text-sm font-semibold tabular-nums">{emergencyFundProgress.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500/70 rounded-full" style={{ width: `${emergencyFundProgress}%` }} />
                        </div>
                        <div className="flex justify-between text-[11px] text-muted-foreground/70 mt-1.5 tabular-nums">
                            <span>{privateMoney(fluidAssetsTotal)}</span>
                            <span>{isPrivacyMode ? '••••' : `目標 ${formatMoney(emergencyFundTarget)}`}</span>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-card px-4 py-3">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-muted-foreground">投資佔比</span>
                            <span className={cn('text-sm font-semibold tabular-nums', investmentRatio >= INVESTMENT_RATIO_HEALTHY_THRESHOLD ? 'text-emerald-600' : 'text-foreground')}>
                                {investmentRatio.toFixed(1)}%
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500/70 rounded-full" style={{ width: `${Math.min(investmentRatio, 100)}%` }} />
                        </div>
                        <div className="text-[11px] text-muted-foreground/70 mt-1.5">
                            {investmentRatio >= INVESTMENT_RATIO_HEALTHY_THRESHOLD ? '投資佔比健康 🚀' : `建議投資比例至少 ${INVESTMENT_RATIO_HEALTHY_THRESHOLD}%`}
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* ── 收入 ─────────────────────────────────── */}
                <div className="xl:col-span-1">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">每月預期收入</h2>
                        <button onClick={() => { setEditingIncomeItem(null); setIsIncomeDialogOpen(true); }} className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {incomeItems.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
                            <p className="text-sm text-muted-foreground mb-3">尚未設定預期收入</p>
                            <Button variant="outline" onClick={() => { setEditingIncomeItem(null); setIsIncomeDialogOpen(true); }}>新增收入</Button>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-border bg-card divide-y divide-border/50">
                            {incomeItems.map(item => (
                                <div key={item.id} onClick={() => { setEditingIncomeItem(item); setIsIncomeDialogOpen(true); }} className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors group">
                                    <span className="text-sm font-medium">{item.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold tabular-nums">{privateMoney(item.amount)}</span>
                                        <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── 預算類別 ──────────────────────────────── */}
                <div className="xl:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">預算類別</h2>
                        <button onClick={openAddBudget} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                            <Plus className="w-3.5 h-3.5" /> 新增類別
                        </button>
                    </div>

                    {categories.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
                            <p className="text-sm text-muted-foreground mb-3">尚無預算類別</p>
                            <Button variant="outline" onClick={openAddBudget}>新增第一筆預算</Button>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {MACRO_GROUPS.map(group => {
                                const groupCats = groupedBudgets[group];
                                if (!groupCats?.length) return null;
                                const groupTotal = groupCats.reduce((s, c) => s + c.budget_amount, 0);
                                const groupPct = totalBudget > 0 ? (groupTotal / totalBudget) * 100 : 0;

                                return (
                                    <div key={group}>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{GROUP_ZH[group]}</h3>
                                            <span className="text-xs text-muted-foreground tabular-nums">
                                                {privateMoney(groupTotal)}
                                                <span className="opacity-50 ml-1">({groupPct.toFixed(0)}%)</span>
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {groupCats.map(cat => {
                                                const colors = getColors(cat.color ?? null);
                                                return (
                                                    <div
                                                        key={cat.id}
                                                        onClick={() => openEditBudget(cat)}
                                                        className="rounded-2xl border border-border bg-card p-4 cursor-pointer hover:border-border/80 transition-colors group relative"
                                                    >
                                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-60 transition-opacity">
                                                            <Pencil className="w-3 h-3 text-muted-foreground" />
                                                        </div>
                                                        <div className="flex items-center gap-2.5 mb-2.5">
                                                            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', colors.bg)}>
                                                                <AssetIcon icon={cat.icon || 'ShoppingBag'} className={cn('w-4 h-4', colors.text)} />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-sm font-semibold truncate">{cat.name}</div>
                                                                {cat.note && <div className="text-[10px] text-muted-foreground truncate">{cat.note}</div>}
                                                            </div>
                                                        </div>
                                                        <div className="font-display text-lg font-medium tabular-nums mb-2 leading-none">
                                                            {privateMoney(cat.budget_amount)}
                                                        </div>
                                                        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                                                            <div className={cn('h-full rounded-full', colors.bar)} style={{ width: groupTotal > 0 ? `${(cat.budget_amount / groupTotal) * 100}%` : '0%' }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Income Dialog */}
            <IncomeItemDialog open={isIncomeDialogOpen} onOpenChange={setIsIncomeDialogOpen} onSave={refreshIncome} editingItem={editingIncomeItem} />

            {/* Budget Dialog */}
            <BudgetCategoryFormSheet
                isOpen={isBudgetDialogOpen}
                onClose={() => setIsBudgetDialogOpen(false)}
                editingBudgetId={editingBudgetId}
                budgetForm={budgetForm}
                setBudgetForm={setBudgetForm}
                onSubmit={handleBudgetSubmit}
                loading={savingBudget}
                confirmDelete={confirmBudgetDelete}
                setConfirmDelete={setConfirmBudgetDelete}
                onDelete={handleBudgetDelete}
                deleting={deletingBudget}
            />
        </div>
    );
}
