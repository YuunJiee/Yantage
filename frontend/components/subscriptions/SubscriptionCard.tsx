'use client';

import { useState } from 'react';
import { Plus, Trash2, Pencil, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ConfirmDelete } from '@/components/ui/confirm-delete';
import { useToast } from '@/components/ui/toast';
import { usePrivateMoney } from '@/lib/usePrivateMoney';
import {
    updateSubscription,
    deleteSubscription,
    addSubscriptionMember,
    updateSubscriptionMember,
    deleteSubscriptionMember,
    deleteCollectionCycle,
    updateCyclePayment,
} from '@/lib/api';
import type { Subscription, CyclePayment } from '@/lib/types';
import { perMemberAmount, todayStr } from './helpers';
import { CycleCard } from './CycleCard';
import { NewCycleDialog } from './NewCycleDialog';

export function SubscriptionCard({
    sub,
    onMutate,
}: {
    sub: Subscription;
    onMutate: () => void;
}) {
    const { toast } = useToast();
    const privateMoney = usePrivateMoney();

    const [showCycles, setShowCycles] = useState(true);
    const [showNewCycle, setShowNewCycle] = useState(false);
    const [editing, setEditing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deletingSub, setDeletingSub] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);
    const [editName, setEditName] = useState(sub.name);
    const [editCost, setEditCost] = useState(String(sub.total_cost));
    const [newMemberName, setNewMemberName] = useState('');
    const [addingMember, setAddingMember] = useState(false);
    const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
    const [memberDraftName, setMemberDraftName] = useState('');
    const [renamingMemberId, setRenamingMemberId] = useState<number | null>(null);
    const [confirmDeleteMemberId, setConfirmDeleteMemberId] = useState<number | null>(null);
    const [deletingMemberId, setDeletingMemberId] = useState<number | null>(null);

    const amount = perMemberAmount(sub);
    const sortedCycles = [...sub.cycles].sort(
        (a, b) => new Date(b.cycle_start).getTime() - new Date(a.cycle_start).getTime()
    );
    const pendingTotal = sub.cycles.flatMap(c => c.payments).filter(p => !p.paid_at).length;

    const openEdit = () => {
        setEditName(sub.name);
        setEditCost(String(sub.total_cost));
        setEditing(true);
    };

    const handleDelete = async () => {
        setDeletingSub(true);
        try {
            await deleteSubscription(sub.id);
            onMutate();
        } catch {
            toast('刪除訂閱失敗', 'error');
        } finally {
            setDeletingSub(false);
        }
    };

    const handleSaveEdit = async () => {
        setSavingEdit(true);
        try {
            await updateSubscription(sub.id, {
                name: editName.trim() || sub.name,
                total_cost: parseFloat(editCost) || sub.total_cost,
            });
            setEditing(false);
            onMutate();
        } catch {
            toast('更新訂閱失敗', 'error');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleAddMember = async () => {
        const name = newMemberName.trim();
        if (!name) return;
        setAddingMember(true);
        try {
            await addSubscriptionMember(sub.id, name);
            setNewMemberName('');
            onMutate();
        } catch {
            toast('新增成員失敗', 'error');
        } finally {
            setAddingMember(false);
        }
    };

    const startRenameMember = (memberId: number, currentName: string) => {
        setEditingMemberId(memberId);
        setMemberDraftName(currentName);
    };

    const handleRenameMember = async (memberId: number) => {
        const name = memberDraftName.trim();
        if (!name) return;
        setRenamingMemberId(memberId);
        try {
            await updateSubscriptionMember(memberId, name);
            setEditingMemberId(null);
            onMutate();
        } catch {
            toast('重新命名成員失敗', 'error');
        } finally {
            setRenamingMemberId(null);
        }
    };

    const handleDeleteMember = async (memberId: number) => {
        setDeletingMemberId(memberId);
        try {
            await deleteSubscriptionMember(memberId);
            setConfirmDeleteMemberId(null);
            onMutate();
        } catch {
            toast('刪除成員失敗', 'error');
        } finally {
            setDeletingMemberId(null);
        }
    };

    const handlePaymentToggle = async (payment: CyclePayment) => {
        try {
            await updateCyclePayment(payment.id, {
                paid_at: payment.paid_at ? null : todayStr(),
            });
            onMutate();
        } catch {
            toast('更新付款狀態失敗', 'error');
        }
    };

    const handleDeleteCycle = async (cycleId: number) => {
        try {
            await deleteCollectionCycle(cycleId);
            onMutate();
        } catch {
            toast('刪除週期失敗', 'error');
        }
    };

    return (
        <>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
                {/* Header */}
                <div className="px-4 py-4 flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        {editing ? (
                            <div className="flex items-center gap-2">
                                <Input
                                    className="h-7 text-sm font-semibold w-32"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    autoFocus
                                />
                                <Input
                                    className="h-7 text-sm w-24"
                                    type="number"
                                    value={editCost}
                                    onChange={e => setEditCost(e.target.value)}
                                />
                                <button onClick={handleSaveEdit} disabled={savingEdit} aria-label="儲存訂閱變更" className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50">
                                    <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => setEditing(false)} disabled={savingEdit} aria-label="取消編輯訂閱" className="text-muted-foreground hover:text-foreground disabled:opacity-50">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-semibold">{sub.name}</h3>
                                {pendingTotal > 0 && (
                                    <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                                        {pendingTotal} 筆待收
                                    </span>
                                )}
                            </div>
                        )}
                        {editing ? (
                            <div className="mt-2 space-y-1.5">
                                {sub.members.map(m => (
                                    <div key={m.id} className="flex items-center gap-1.5">
                                        {editingMemberId === m.id ? (
                                            <>
                                                <input
                                                    className="flex-1 h-6 text-xs rounded-lg border border-border/60 bg-muted/40 px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                                                    value={memberDraftName}
                                                    onChange={e => setMemberDraftName(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleRenameMember(m.id); } }}
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => handleRenameMember(m.id)}
                                                    disabled={renamingMemberId === m.id}
                                                    aria-label={`確認將 ${m.name} 重新命名`}
                                                    className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                                                >
                                                    <Check className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => setEditingMemberId(null)}
                                                    disabled={renamingMemberId === m.id}
                                                    aria-label="取消重新命名"
                                                    className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </>
                                        ) : confirmDeleteMemberId === m.id ? (
                                            <>
                                                <span className="text-xs text-foreground flex-1">{m.name}</span>
                                                <ConfirmDelete
                                                    onConfirm={() => handleDeleteMember(m.id)}
                                                    onCancel={() => setConfirmDeleteMemberId(null)}
                                                    loading={deletingMemberId === m.id}
                                                    label="確定刪除？將一併刪除此成員所有週期的付款紀錄"
                                                    className="flex items-center gap-1.5"
                                                    textClassName="text-[10px] text-red-500"
                                                    confirmClassName="text-[10px] font-medium text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
                                                    cancelClassName="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-xs text-foreground flex-1">{m.name}</span>
                                                <button
                                                    onClick={() => startRenameMember(m.id, m.name)}
                                                    aria-label={`重新命名 ${m.name}`}
                                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDeleteMemberId(m.id)}
                                                    aria-label={`刪除成員 ${m.name}`}
                                                    className="text-muted-foreground hover:text-destructive transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))}
                                <div className="flex items-center gap-1.5 pt-0.5">
                                    <input
                                        className="flex-1 h-6 text-xs rounded-lg border border-border/60 bg-muted/40 px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                                        placeholder="新增成員名稱"
                                        value={newMemberName}
                                        onChange={e => setNewMemberName(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddMember(); } }}
                                    />
                                    <button
                                        onClick={handleAddMember}
                                        disabled={addingMember || !newMemberName.trim()}
                                        aria-label="新增成員"
                                        className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground mt-0.5">
                                月費 {privateMoney(sub.total_cost, '••••', { maximumFractionDigits: 0 })} · 每{sub.collection_period_months}個月收一次 · 共{sub.total_shares}份・我{sub.my_shares}份 ·{' '}
                                {sub.members.map(m => m.name).join('、')}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                        {confirmDelete ? (
                            <ConfirmDelete
                                onConfirm={handleDelete}
                                onCancel={() => setConfirmDelete(false)}
                                loading={deletingSub}
                                className="flex items-center gap-2 pr-1"
                                textClassName="text-xs text-red-500"
                                confirmClassName="text-xs font-medium text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
                                cancelClassName="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            />
                        ) : (
                            <>
                                <button
                                    onClick={openEdit}
                                    aria-label={`編輯 ${sub.name}`}
                                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setConfirmDelete(true)}
                                    aria-label={`刪除 ${sub.name}`}
                                    className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Summary bar */}
                <div className="grid grid-cols-3 divide-x divide-border/40 border-t border-border/40 bg-muted/20">
                    {[
                        { label: '月費', value: privateMoney(sub.total_cost, '••••', { maximumFractionDigits: 0 }) },
                        { label: `每人每${sub.collection_period_months}個月`, value: privateMoney(amount, '••••', { maximumFractionDigits: 0 }) },
                        { label: '歷史週期', value: `${sub.cycles.length} 期` },
                    ].map(item => (
                        <div key={item.label} className="px-3 py-2 text-center">
                            <div className="text-[10px] text-muted-foreground">{item.label}</div>
                            <div className="text-sm font-medium tabular-nums">{item.value}</div>
                        </div>
                    ))}
                </div>

                {/* Cycles */}
                <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between mb-1">
                        <button
                            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                            onClick={() => setShowCycles(v => !v)}
                        >
                            收款紀錄
                            {showCycles ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        <button
                            onClick={() => setShowNewCycle(true)}
                            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" /> 新增週期
                        </button>
                    </div>

                    {showCycles && (
                        sortedCycles.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-2">尚無收款紀錄，點擊「新增週期」開始追蹤。</p>
                        ) : (
                            <div className="space-y-2">
                                {sortedCycles.map(cycle => (
                                    <CycleCard
                                        key={cycle.id}
                                        cycle={cycle}
                                        onPaymentToggle={handlePaymentToggle}
                                        onDelete={() => handleDeleteCycle(cycle.id)}
                                    />
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>

            {showNewCycle && (
                <NewCycleDialog
                    sub={sub}
                    onClose={() => setShowNewCycle(false)}
                    onSaved={onMutate}
                />
            )}
        </>
    );
}
