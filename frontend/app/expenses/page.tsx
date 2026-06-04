'use client';

import { useState } from 'react';
import { Plus, Trash2, Pencil, ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePrivacy } from "@/components/PrivacyProvider";
import { cn } from '@/lib/utils';
import { API_URL } from '@/lib/api';
import { useBudgetCategories, useIncomeItems, useDashboard } from '@/lib/hooks';
import { IconPicker, AssetIcon } from '@/components/IconPicker';
import { IncomeItemDialog } from '@/components/views/IncomeItemDialog';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { PageError } from '@/components/ui/skeleton';
import type { BudgetCategory, IncomeItem } from '@/lib/types';

const COLOR_OPTIONS = [
    { value: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-600', bar: 'bg-emerald-500' },
    { value: 'blue', bg: 'bg-blue-100', text: 'text-blue-600', bar: 'bg-blue-500' },
    { value: 'purple', bg: 'bg-purple-100', text: 'text-purple-600', bar: 'bg-purple-500' },
    { value: 'amber', bg: 'bg-amber-100', text: 'text-amber-600', bar: 'bg-amber-500' },
    { value: 'pink', bg: 'bg-pink-100', text: 'text-pink-600', bar: 'bg-pink-500' },
    { value: 'cyan', bg: 'bg-cyan-100', text: 'text-cyan-600', bar: 'bg-cyan-500' },
    { value: 'orange', bg: 'bg-orange-100', text: 'text-orange-600', bar: 'bg-orange-500' },
    { value: 'rose', bg: 'bg-rose-100', text: 'text-rose-600', bar: 'bg-rose-500' },
];

const getColors = (color: string | null) => COLOR_OPTIONS.find(c => c.value === color) ?? COLOR_OPTIONS[0];

const MACRO_GROUPS = ['Fixed', 'Living', 'Investment', 'Growth', 'Unassigned'] as const;
const GROUP_ZH: Record<string, string> = { Fixed: '固定生存', Living: '生活支出', Investment: '投資', Growth: '成長', Unassigned: '未分類' };

export default function BudgetPage() {
    const { isPrivacyMode } = usePrivacy();
    const { categories, refresh: refreshBudgets, isLoading, isError } = useBudgetCategories();
    const { incomeItems, refresh: refreshIncome } = useIncomeItems();
    const { dashboard } = useDashboard();

    const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
    const [editingBudgetId, setEditingBudgetId] = useState<number | null>(null);
    const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
    const [editingIncomeItem, setEditingIncomeItem] = useState<IncomeItem | null>(null);

    const defaultBudgetForm = { name: '', icon: '', budget_amount: '', color: 'emerald', note: '', group_name: 'Unassigned' };
    const [budgetForm, setBudgetForm] = useState(defaultBudgetForm);

    const openAddBudget = () => { setEditingBudgetId(null); setBudgetForm(defaultBudgetForm); setIsBudgetDialogOpen(true); };
    const openEditBudget = (cat: BudgetCategory) => {
        setEditingBudgetId(cat.id);
        setBudgetForm({ name: cat.name, icon: cat.icon ?? '', budget_amount: cat.budget_amount.toString(), color: cat.color ?? 'emerald', note: cat.note ?? '', group_name: cat.group_name || 'Unassigned' });
        setIsBudgetDialogOpen(true);
    };

    const handleBudgetSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { name: budgetForm.name, icon: budgetForm.icon || null, budget_amount: parseFloat(budgetForm.budget_amount), color: budgetForm.color || null, note: budgetForm.note || null, group_name: budgetForm.group_name || 'Unassigned' };
        try {
            const url = editingBudgetId ? `${API_URL}/budgets/categories/${editingBudgetId}` : `${API_URL}/budgets/categories`;
            await fetch(url, { method: editingBudgetId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            setIsBudgetDialogOpen(false);
            refreshBudgets();
        } catch (err) { console.error(err); }
    };

    const handleBudgetDelete = async () => {
        if (!editingBudgetId || !confirm('確定要刪除此預算類別嗎？')) return;
        await fetch(`${API_URL}/budgets/categories/${editingBudgetId}`, { method: 'DELETE' });
        setIsBudgetDialogOpen(false);
        refreshBudgets();
    };

    // Metrics
    const totalIncome = incomeItems.reduce((s, i) => s + i.amount, 0);
    const totalBudget = categories.reduce((s, c) => s + c.budget_amount, 0);
    const deficit = totalIncome - totalBudget;

    const investmentBudgets = categories.filter(c => c.group_name === 'Investment').reduce((s, c) => s + c.budget_amount, 0);
    const investmentRatio = totalIncome > 0 ? (investmentBudgets / totalIncome) * 100 : 0;

    const assets = dashboard?.assets ?? [];
    const fluidAssetsTotal = assets.filter(a => a.category === 'Fluid' || a.category === 'Crypto').reduce((s, a) => s + (a.value_twd || 0), 0);
    const survivalMonthlyCost = categories.filter(c => c.group_name === 'Fixed' || c.group_name === 'Living').reduce((s, c) => s + c.budget_amount, 0);
    const emergencyFundTarget = survivalMonthlyCost * 3;
    const emergencyFundProgress = emergencyFundTarget > 0 ? Math.min((fluidAssetsTotal / emergencyFundTarget) * 100, 100) : 0;

    const deficitStatus = deficit > 0
        ? { icon: ShieldCheck, color: 'text-emerald-600', label: '安全 · 可儲蓄' }
        : deficit > -5000
            ? { icon: AlertTriangle, color: 'text-amber-500', label: '小赤字 · 警告' }
            : { icon: AlertCircle, color: 'text-red-500', label: '大赤字 · 危險' };
    const DeficitIcon = deficitStatus.icon;

    const groupedBudgets = MACRO_GROUPS.reduce((acc, group) => {
        acc[group] = categories.filter(c => (c.group_name || 'Unassigned') === group);
        return acc;
    }, {} as Record<string, BudgetCategory[]>);

    if (isLoading) return (
        <div className="mx-auto max-w-5xl px-4 py-8 space-y-6 animate-pulse">
            <div className="h-6 w-24 bg-muted rounded" />
            <div className="h-8 w-32 bg-muted rounded" />
            <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl" />)}</div>
        </div>
    );

    if (isError) return <PageError onRetry={refreshBudgets} />;

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
                            {isPrivacyMode ? '••••' : `$${totalIncome.toLocaleString()}`}
                        </div>
                    </div>
                    <div className="px-6">
                        <div className="text-[11px] text-muted-foreground mb-1.5">總預算</div>
                        <div className="font-display text-2xl font-medium tabular-nums leading-none">
                            {isPrivacyMode ? '••••' : `$${totalBudget.toLocaleString()}`}
                        </div>
                    </div>
                    <div className="pl-6">
                        <div className={cn('flex items-center gap-1.5 text-[11px] font-medium mb-1.5', deficitStatus.color)}>
                            <DeficitIcon className="w-3.5 h-3.5" />
                            {deficitStatus.label}
                        </div>
                        <div className={cn('font-display text-2xl font-medium tabular-nums leading-none', deficitStatus.color)}>
                            {isPrivacyMode ? '••••' : `$${Math.abs(deficit).toLocaleString()}`}
                        </div>
                    </div>
                </div>

                {/* Secondary metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-border bg-card px-4 py-3">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-muted-foreground">緊急預備金（3 個月）</span>
                            <span className="text-sm font-semibold tabular-nums">{emergencyFundProgress.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500/70 rounded-full" style={{ width: `${emergencyFundProgress}%` }} />
                        </div>
                        <div className="flex justify-between text-[11px] text-muted-foreground/70 mt-1.5 tabular-nums">
                            <span>{isPrivacyMode ? '••••' : `$${fluidAssetsTotal.toLocaleString()}`}</span>
                            <span>{isPrivacyMode ? '••••' : `目標 $${emergencyFundTarget.toLocaleString()}`}</span>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-card px-4 py-3">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-muted-foreground">投資佔比</span>
                            <span className={cn('text-sm font-semibold tabular-nums', investmentRatio >= 20 ? 'text-emerald-600' : 'text-foreground')}>
                                {investmentRatio.toFixed(1)}%
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500/70 rounded-full" style={{ width: `${Math.min(investmentRatio, 100)}%` }} />
                        </div>
                        <div className="text-[11px] text-muted-foreground/70 mt-1.5">
                            {investmentRatio >= 20 ? '投資佔比健康 🚀' : '建議投資比例至少 20%'}
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
                                        <span className="text-sm font-semibold tabular-nums">{isPrivacyMode ? '••••' : `$${item.amount.toLocaleString()}`}</span>
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
                                                {isPrivacyMode ? '••••' : `$${groupTotal.toLocaleString()}`}
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
                                                                {cat.icon ? <AssetIcon icon={cat.icon} className={cn('w-4 h-4', colors.text)} /> : <span className="text-sm">📦</span>}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-sm font-semibold truncate">{cat.name}</div>
                                                                {cat.note && <div className="text-[10px] text-muted-foreground truncate">{cat.note}</div>}
                                                            </div>
                                                        </div>
                                                        <div className="font-display text-lg font-medium tabular-nums mb-2 leading-none">
                                                            {isPrivacyMode ? '••••' : `$${cat.budget_amount.toLocaleString()}`}
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
            <Dialog
                isOpen={isBudgetDialogOpen}
                onClose={() => setIsBudgetDialogOpen(false)}
                title={editingBudgetId ? '編輯類別' : '新增類別'}
            >
                <form onSubmit={handleBudgetSubmit} className="space-y-0">

                    {/* ── 圖示 & 名稱 ──────────────────────────── */}
                    <div className="pb-5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">名稱</p>
                        <div className="flex gap-3 items-end">
                            <IconPicker
                                value={budgetForm.icon}
                                onChange={(icon: string) => setBudgetForm({ ...budgetForm, icon })}
                                defaultIcon="ShoppingBag"
                                className="shrink-0 h-11 w-11 rounded-xl border-border"
                                iconClassName="w-5 h-5 text-foreground"
                            />
                            <Input
                                placeholder="例如：食物、交通、娛樂"
                                value={budgetForm.name}
                                onChange={e => setBudgetForm({ ...budgetForm, name: e.target.value })}
                                required
                                className="flex-1"
                            />
                        </div>
                    </div>

                    {/* ── 大項分類 ──────────────────────────────── */}
                    <div className="border-t border-border/20 py-5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">大項分類</p>
                        <div className="flex flex-wrap gap-1.5">
                            {MACRO_GROUPS.map(g => (
                                <button key={g} type="button" onClick={() => setBudgetForm({ ...budgetForm, group_name: g })}
                                    className={cn(
                                        'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150',
                                        budgetForm.group_name === g
                                            ? 'bg-foreground text-background border-foreground'
                                            : 'bg-transparent border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground'
                                    )}>
                                    {GROUP_ZH[g]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── 預算金額 ──────────────────────────────── */}
                    <div className="border-t border-border/20 py-5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">每月預算（TWD）</p>
                        <MoneyInput
                            className="tabular-nums"
                            value={budgetForm.budget_amount}
                            onChange={e => setBudgetForm({ ...budgetForm, budget_amount: e.target.value })}
                            required
                        />
                    </div>

                    {/* ── 顏色 ─────────────────────────────────── */}
                    <div className="border-t border-border/20 py-5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">顏色標記</p>
                        <div className="flex gap-2.5 flex-wrap">
                            {COLOR_OPTIONS.map(c => (
                                <button key={c.value} type="button" onClick={() => setBudgetForm({ ...budgetForm, color: c.value })}
                                    className={cn('w-7 h-7 rounded-full transition-all border-2', c.bar,
                                        budgetForm.color === c.value ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                                    )} />
                            ))}
                        </div>
                    </div>

                    {/* ── 備註 ─────────────────────────────────── */}
                    <div className="border-t border-border/20 py-5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">備註（選填）</p>
                        <Input
                            placeholder="例如：包含外食和買菜"
                            value={budgetForm.note}
                            onChange={e => setBudgetForm({ ...budgetForm, note: e.target.value })}
                        />
                    </div>

                    {/* ── 操作 ─────────────────────────────────── */}
                    <div className="border-t border-border/20 pt-4 flex items-center justify-between">
                        {editingBudgetId ? (
                            <button type="button" onClick={handleBudgetDelete}
                                className="flex items-center gap-1.5 text-sm text-destructive/70 hover:text-destructive transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                                刪除
                            </button>
                        ) : <span />}
                        <Button type="submit">{editingBudgetId ? '儲存變更' : '新增類別'}</Button>
                    </div>
                </form>
            </Dialog>
        </div>
    );
}
