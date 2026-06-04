'use client';

import { useState, useEffect } from 'react';
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from '@/components/ui/MoneyInput';
import { CustomSelect } from "@/components/ui/custom-select";
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";

import { API_URL } from '@/lib/api';
import { Trash2 } from 'lucide-react';
import type { Goal } from '@/lib/types';
import { CATEGORY_ZH } from '@/lib/constants';

// Categories available for allocation goals
const ALLOCATION_CATEGORIES = ['Fluid', 'Stock', 'Crypto', 'Fixed', 'Receivables'];

type AllocationMap = Record<string, number>; // { Fluid: 20, Stock: 50, ... }

function parseAllocation(allocationData?: string): AllocationMap {
    if (!allocationData) return { Stock: 60, Fluid: 40 };
    try {
        const parsed = JSON.parse(allocationData);
        if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch { }
    // Legacy: plain category name string (pre-migration data)
    return { [allocationData]: 100 };
}

interface GoalDialogProps {
    isOpen: boolean;
    onClose: () => void;
    initialGoal?: Goal | null;
}

export function GoalDialog({ isOpen, onClose, initialGoal }: GoalDialogProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [goalType, setGoalType] = useState<'NET_WORTH' | 'ASSET_ALLOCATION'>('NET_WORTH');
    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    // Allocation map: category -> target %
    const [allocation, setAllocation] = useState<AllocationMap>({ Stock: 60, Fluid: 20, Crypto: 20 });

    const goalTypes = [
        { value: 'NET_WORTH', label: 'FIRE / 淨值目標' },
        { value: 'ASSET_ALLOCATION', label: '資產配置目標' },
    ];

    useEffect(() => {
        if (initialGoal) {
            setGoalType(initialGoal.goal_type || 'NET_WORTH');
            setName(initialGoal.name || '');
            setTargetAmount(String(initialGoal.target_amount || ''));
            if (initialGoal.goal_type === 'ASSET_ALLOCATION') {
                setAllocation(parseAllocation(initialGoal.allocation_data));
            }
        } else {
            setGoalType('NET_WORTH');
            setName('');
            setTargetAmount('');
            setAllocation({ Stock: 60, Fluid: 20, Crypto: 20 });
        }
    }, [initialGoal, isOpen]);

    // ----- Allocation editor helpers -----
    const total = Object.values(allocation).reduce((s, v) => s + (v || 0), 0);
    const remaining = 100 - total;

    const setPercent = (category: string, value: number) => {
        setAllocation(prev => ({ ...prev, [category]: Math.max(0, Math.min(100, value)) }));
    };

    const addCategory = (cat: string) => {
        if (cat in allocation) return;
        setAllocation(prev => ({ ...prev, [cat]: 0 }));
    };

    const removeCategory = (cat: string) => {
        const next = { ...allocation };
        delete next[cat];
        setAllocation(next);
    };

    const availableToAdd = ALLOCATION_CATEGORIES.filter(c => !(c in allocation));

    // ----- Submit -----
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (goalType === 'ASSET_ALLOCATION' && Math.abs(total - 100) > 0.01) return;
        setLoading(true);

        const payload =
            goalType === 'NET_WORTH'
                ? {
                    name,
                    target_amount: parseFloat(targetAmount),
                    goal_type: 'NET_WORTH',
                    allocation_data: null,
                }
                : {
                    name,
                    target_amount: 100,
                    goal_type: 'ASSET_ALLOCATION',
                    allocation_data: JSON.stringify(allocation),
                };

        try {
            const url = initialGoal ? `${API_URL}/goals/${initialGoal.id}` : `${API_URL}/goals/`;
            await fetch(url, {
                method: initialGoal ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            onClose();
            router.refresh();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ----- Delete -----
    const handleDelete = async () => {
        if (!initialGoal) return;
        if (!window.confirm('確定要刪除這個目標嗎？')) return;
        setDeleting(true);
        try {
            await fetch(`${API_URL}/goals/${initialGoal.id}`, { method: 'DELETE' });
            onClose();
            router.refresh();
        } catch (err) {
            console.error(err);
        } finally {
            setDeleting(false);
        }
    };

    const isAllocation = goalType === 'ASSET_ALLOCATION';
    const isValid = isAllocation ? Math.abs(total - 100) <= 0.01 : !!targetAmount;

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title={initialGoal ? '更新財務目標' : '設定財務目標'}>
            <form onSubmit={handleSubmit} className="space-y-0">

                {/* ── 目標類型 ──────────────────────────── */}
                <div className="pb-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">目標類型</p>
                    <CustomSelect value={goalType} onChange={(v) => setGoalType(v as 'NET_WORTH' | 'ASSET_ALLOCATION')} options={goalTypes} />
                </div>

                {/* ── 基本資訊 ───────────────────────────── */}
                <div className="border-t border-border/20 py-5 space-y-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">目標名稱</p>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder={isAllocation ? '例如：平衡型配置' : '例如：FIRE 2030'}
                        className="-mt-2"
                    />

                    {!isAllocation && (
                        <div className="space-y-1.5 mt-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">目標金額（TWD）</p>
                            <MoneyInput
                                className="tabular-nums"
                                value={targetAmount}
                                onChange={(e) => setTargetAmount(e.target.value)}
                                required
                                placeholder="例如：30,000,000"
                            />
                        </div>
                    )}
                </div>

                {/* ── 配置編輯器 ─────────────────────────── */}
                {isAllocation && (
                    <div className="border-t border-border/20 py-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">目標配置</p>
                            <span className={cn(
                                'font-display text-sm font-medium tabular-nums',
                                Math.abs(total - 100) <= 0.01 ? 'text-trend-up' : 'text-destructive'
                            )}>
                                {total.toFixed(0)}%
                            </span>
                        </div>

                        <div className="space-y-2">
                            {Object.entries(allocation).map(([cat, pct]) => (
                                <div key={cat} className="flex items-center gap-3">
                                    <span className="w-20 text-sm text-muted-foreground shrink-0">{CATEGORY_ZH[cat] ?? cat}</span>
                                    <div className="relative flex-1">
                                        <Input
                                            type="number" min="0" max="100" step="1"
                                            value={pct}
                                            onChange={(e) => setPercent(cat, Number(e.target.value))}
                                            className="tabular-nums text-right pr-7 h-9 w-full"
                                        />
                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 text-sm pointer-events-none">%</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeCategory(cat)}
                                        disabled={Object.keys(allocation).length <= 1}
                                        className="shrink-0 text-muted-foreground/40 hover:text-destructive transition-colors disabled:opacity-20"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {availableToAdd.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap pt-1">
                                {availableToAdd.map(cat => (
                                    <button key={cat} type="button" onClick={() => addCategory(cat)}
                                        className="text-[11px] px-2.5 py-1 rounded-lg border border-dashed border-border/60 text-muted-foreground hover:border-primary hover:text-foreground transition-colors">
                                        + {CATEGORY_ZH[cat] ?? cat}
                                    </button>
                                ))}
                            </div>
                        )}

                        {Math.abs(total - 100) > 0.01 && (
                            <p className="text-[11px] text-destructive">
                                {remaining > 0 ? `還差 ${remaining.toFixed(0)}% 未分配` : '總計超過 100%，請調整。'}
                            </p>
                        )}
                    </div>
                )}

                {/* ── 操作按鈕 ───────────────────────────── */}
                <div className="border-t border-border/20 pt-4 flex items-center justify-between">
                    {initialGoal ? (
                        <button type="button" onClick={handleDelete} disabled={deleting}
                            className="flex items-center gap-1.5 text-sm text-destructive/70 hover:text-destructive transition-colors disabled:opacity-50">
                            <Trash2 className="w-3.5 h-3.5" />
                            {deleting ? '刪除中…' : '刪除'}
                        </button>
                    ) : <span />}
                    <Button type="submit" disabled={loading || !isValid}>
                        {loading ? '儲存中…' : (initialGoal ? '更新目標' : '設定目標')}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
