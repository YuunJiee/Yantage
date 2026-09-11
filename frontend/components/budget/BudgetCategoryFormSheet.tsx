'use client';

import { Trash2 } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { ConfirmDelete } from '@/components/ui/confirm-delete';
import { IconPicker } from '@/components/IconPicker';
import { cn } from '@/lib/utils';
import { COLOR_OPTIONS, MACRO_GROUPS, GROUP_ZH } from './constants';

export interface BudgetFormState {
    name: string;
    icon: string;
    budget_amount: string;
    color: string;
    note: string;
    group_name: string;
}

interface BudgetCategoryFormSheetProps {
    isOpen: boolean;
    onClose: () => void;
    editingBudgetId: number | null;
    budgetForm: BudgetFormState;
    setBudgetForm: (form: BudgetFormState) => void;
    onSubmit: (e: React.FormEvent) => void;
    confirmDelete: boolean;
    setConfirmDelete: (v: boolean) => void;
    onDelete: () => void;
}

export function BudgetCategoryFormSheet({
    isOpen,
    onClose,
    editingBudgetId,
    budgetForm,
    setBudgetForm,
    onSubmit,
    confirmDelete,
    setConfirmDelete,
    onDelete,
}: BudgetCategoryFormSheetProps) {
    return (
        <Sheet
            isOpen={isOpen}
            onClose={onClose}
            title={editingBudgetId ? '編輯類別' : '新增類別'}
        >
            <form onSubmit={onSubmit} className="space-y-0">

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
                        confirmDelete ? (
                            <ConfirmDelete
                                onConfirm={onDelete}
                                onCancel={() => setConfirmDelete(false)}
                            />
                        ) : (
                            <button type="button" onClick={() => setConfirmDelete(true)}
                                className="flex items-center gap-1.5 text-sm text-destructive/70 hover:text-destructive transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                                刪除
                            </button>
                        )
                    ) : <span />}
                    <Button type="submit">{editingBudgetId ? '儲存變更' : '新增類別'}</Button>
                </div>
            </form>
        </Sheet>
    );
}
