'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2, Pencil, ChevronDown, ChevronUp, Check, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
    fetchSubscriptions,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    addSubscriptionMember,
    deleteSubscriptionMember,
    createCollectionCycle,
    deleteCollectionCycle,
    updateCyclePayment,
} from '@/lib/api';
import type { Subscription, CollectionCycle, CyclePayment } from '@/lib/types';
import useSWR from 'swr';

// --- Helpers ---

// total_cost = 每月費用（所有份數合計），每人每次收款 = (月費/份數) × 月數
function perMemberAmount(sub: Subscription): number {
    if (sub.total_shares === 0) return 0;
    return (sub.total_cost / sub.total_shares) * sub.collection_period_months;
}

function formatDate(d: string) {
    return d.replace(/-/g, '/');
}

function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

// --- New Subscription Dialog ---

interface NewSubForm {
    name: string;
    total_cost: string;
    total_shares: string;
    my_shares: string;
    collection_period_months: string;
    members: string[];
}

const EMPTY_FORM: NewSubForm = {
    name: '',
    total_cost: '',
    total_shares: '',
    my_shares: '',
    collection_period_months: '6',
    members: [''],
};

function NewSubscriptionDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState<NewSubForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const othersCount = Math.max(0, parseInt(form.total_shares || '0') - parseInt(form.my_shares || '0'));

    const handleMemberName = (i: number, val: string) =>
        setForm(f => { const m = [...f.members]; m[i] = val; return { ...f, members: m }; });
    const handleRemoveMember = (i: number) =>
        setForm(f => ({ ...f, members: f.members.filter((_, idx) => idx !== i) }));

    const handleSave = async () => {
        const filledMembers = form.members.map(m => m.trim()).filter(Boolean);
        if (!form.name.trim()) return setError('請填寫訂閱名稱');
        if (!form.total_cost || isNaN(parseFloat(form.total_cost))) return setError('請填寫正確費用');
        if (!form.total_shares || parseInt(form.total_shares) < 1) return setError('請填寫總份數');
        if (!form.my_shares || parseInt(form.my_shares) < 1) return setError('請填寫我的份數');
        if (parseInt(form.my_shares) > parseInt(form.total_shares)) return setError('我的份數不能超過總份數');
        if (filledMembers.length !== othersCount) return setError(`其他 ${othersCount} 人需填入 ${othersCount} 位成員名稱`);

        setSaving(true);
        setError('');
        try {
            await createSubscription({
                name: form.name.trim(),
                total_cost: parseFloat(form.total_cost),
                total_shares: parseInt(form.total_shares),
                my_shares: parseInt(form.my_shares),
                collection_period_months: parseInt(form.collection_period_months) || 6,
                members: filledMembers.map(name => ({ name })),
            });
            onSaved();
            onClose();
        } catch {
            setError('儲存失敗，請再試一次');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet isOpen onClose={onClose} title="新增分帳訂閱">
            <div className="space-y-4">
                <div>
                    <label className="text-xs text-muted-foreground mb-1 block">訂閱名稱</label>
                    <Input
                        placeholder="e.g. YouTube Premium"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">每月費用 (TWD，所有份數)</label>
                        <Input
                            type="number"
                            placeholder="0"
                            value={form.total_cost}
                            onChange={e => setForm(f => ({ ...f, total_cost: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">收款週期（月）</label>
                        <Input
                            type="number"
                            placeholder="6"
                            value={form.collection_period_months}
                            onChange={e => setForm(f => ({ ...f, collection_period_months: e.target.value }))}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">總份數（所有人）</label>
                        <Input
                            type="number"
                            placeholder="6"
                            value={form.total_shares}
                            onChange={e => setForm(f => ({ ...f, total_shares: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">我負責幾份</label>
                        <Input
                            type="number"
                            placeholder="3"
                            value={form.my_shares}
                            onChange={e => setForm(f => ({ ...f, my_shares: e.target.value }))}
                        />
                    </div>
                </div>

                {othersCount > 0 && (
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                            需收款成員（{othersCount} 位）
                        </label>
                        <div className="space-y-2">
                            {Array.from({ length: othersCount }).map((_, i) => (
                                <div key={i} className="flex gap-2">
                                    <Input
                                        placeholder={`成員 ${i + 1}`}
                                        value={form.members[i] ?? ''}
                                        onChange={e => handleMemberName(i, e.target.value)}
                                    />
                                    {i >= form.members.length - 1 && form.members.length > 1 && (
                                        <button onClick={() => handleRemoveMember(i)} className="text-muted-foreground hover:text-destructive">
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {error && <p className="text-xs text-red-500">{error}</p>}

                <div className="flex gap-2 justify-end pt-2">
                    <Button variant="ghost" onClick={onClose} disabled={saving}>取消</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? '儲存中…' : '儲存'}
                    </Button>
                </div>
            </div>
        </Sheet>
    );
}

// --- New Cycle Dialog ---

function NewCycleDialog({
    sub,
    onClose,
    onSaved,
}: {
    sub: Subscription;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [cycleStart, setCycleStart] = useState(todayStr());
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await createCollectionCycle(sub.id, { cycle_start: cycleStart, note: note || undefined });
            onSaved();
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet isOpen onClose={onClose} title={`新增收款週期 — ${sub.name}`}>
            <div className="space-y-4">
                <div>
                    <label className="text-xs text-muted-foreground mb-1 block">週期開始日期</label>
                    <Input type="date" value={cycleStart} onChange={e => setCycleStart(e.target.value)} />
                </div>
                <div>
                    <label className="text-xs text-muted-foreground mb-1 block">備註（選填）</label>
                    <Input placeholder="e.g. 2026 上半年" value={note} onChange={e => setNote(e.target.value)} />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                    <Button variant="ghost" onClick={onClose} disabled={saving}>取消</Button>
                    <Button onClick={handleSave} disabled={saving}>{saving ? '儲存中…' : '確認'}</Button>
                </div>
            </div>
        </Sheet>
    );
}

// --- Payment row ---

function PaymentRow({
    payment,
    amount,
    onToggle,
}: {
    payment: CyclePayment;
    amount: number;
    onToggle: (payment: CyclePayment) => void;
}) {
    const paid = !!payment.paid_at;
    return (
        <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2.5">
                <button
                    onClick={() => onToggle(payment)}
                    className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                        paid
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-border hover:border-muted-foreground'
                    )}
                >
                    {paid && <Check className="w-3 h-3" />}
                </button>
                <span className={cn('text-sm', paid && 'text-muted-foreground line-through')}>
                    {payment.member.name}
                </span>
            </div>
            <div className="text-right">
                <span className={cn('text-sm font-medium tabular-nums', paid ? 'text-muted-foreground' : 'text-foreground')}>
                    NT${Math.round(amount).toLocaleString()}
                </span>
                {paid && payment.paid_at && (
                    <div className="text-[10px] text-muted-foreground">{formatDate(payment.paid_at)}</div>
                )}
            </div>
        </div>
    );
}

// --- Cycle card ---

function CycleCard({
    cycle,
    amount,
    onPaymentToggle,
    onDelete,
}: {
    cycle: CollectionCycle;
    amount: number;
    onPaymentToggle: (p: CyclePayment) => void;
    onDelete: () => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const paidCount = cycle.payments.filter(p => p.paid_at).length;
    const total = cycle.payments.length;
    const allPaid = paidCount === total && total > 0;

    return (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                onClick={() => setExpanded(e => !e)}
            >
                <div className="flex items-center gap-2">
                    {allPaid ? (
                        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">已全收</span>
                    ) : (
                        <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">收款中</span>
                    )}
                    <span className="text-sm font-medium">{formatDate(cycle.cycle_start)}</span>
                    {cycle.note && <span className="text-xs text-muted-foreground">· {cycle.note}</span>}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{paidCount}/{total}</span>
                    {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-3 divide-y divide-border/40">
                    {cycle.payments.map(p => (
                        <PaymentRow key={p.id} payment={p} amount={amount} onToggle={onPaymentToggle} />
                    ))}
                    <div className="pt-2 flex justify-end items-center gap-2">
                        {confirmDelete ? (
                            <>
                                <span className="text-[11px] text-red-500">確定刪除？</span>
                                <button
                                    onClick={onDelete}
                                    className="text-[11px] font-medium text-red-500 hover:text-red-600 transition-colors"
                                >確定</button>
                                <button
                                    onClick={() => setConfirmDelete(false)}
                                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                                >取消</button>
                            </>
                        ) : (
                            <button
                                onClick={() => setConfirmDelete(true)}
                                className="text-[11px] text-muted-foreground hover:text-red-500 transition-colors flex items-center gap-1"
                            >
                                <Trash2 className="w-3 h-3" /> 刪除此週期
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Subscription card ---

function SubscriptionCard({
    sub,
    onMutate,
}: {
    sub: Subscription;
    onMutate: () => void;
}) {
    const [showCycles, setShowCycles] = useState(true);
    const [showNewCycle, setShowNewCycle] = useState(false);
    const [editing, setEditing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [editName, setEditName] = useState(sub.name);
    const [editCost, setEditCost] = useState(String(sub.total_cost));
    const [newMemberName, setNewMemberName] = useState('');
    const [addingMember, setAddingMember] = useState(false);

    const amount = perMemberAmount(sub);
    const sortedCycles = [...sub.cycles].sort(
        (a, b) => new Date(b.cycle_start).getTime() - new Date(a.cycle_start).getTime()
    );
    const pendingTotal = sub.cycles.flatMap(c => c.payments).filter(p => !p.paid_at).length;

    const handleDelete = async () => {
        await deleteSubscription(sub.id);
        onMutate();
    };

    const handleSaveEdit = async () => {
        await updateSubscription(sub.id, {
            name: editName.trim() || sub.name,
            total_cost: parseFloat(editCost) || sub.total_cost,
        });
        setEditing(false);
        onMutate();
    };

    const handleAddMember = async () => {
        const name = newMemberName.trim();
        if (!name) return;
        setAddingMember(true);
        await addSubscriptionMember(sub.id, name);
        setNewMemberName('');
        setAddingMember(false);
        onMutate();
    };

    const handleDeleteMember = async (memberId: number) => {
        await deleteSubscriptionMember(memberId);
        onMutate();
    };

    const handlePaymentToggle = async (payment: CyclePayment) => {
        await updateCyclePayment(payment.id, {
            paid_at: payment.paid_at ? null : todayStr(),
        });
        onMutate();
    };

    const handleDeleteCycle = async (cycleId: number) => {
        await deleteCollectionCycle(cycleId);
        onMutate();
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
                                <button onClick={handleSaveEdit} className="text-emerald-600 hover:text-emerald-700">
                                    <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground">
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
                                        <span className="text-xs text-foreground flex-1">{m.name}</span>
                                        <button
                                            onClick={() => handleDeleteMember(m.id)}
                                            className="text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
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
                                        className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground mt-0.5">
                                月費 NT${Math.round(sub.total_cost).toLocaleString()} · 每{sub.collection_period_months}個月收一次 ·{' '}
                                {sub.members.map(m => m.name).join('、')}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                        {confirmDelete ? (
                            <div className="flex items-center gap-2 pr-1">
                                <span className="text-xs text-red-500">確定刪除？</span>
                                <button
                                    onClick={handleDelete}
                                    className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
                                >確定</button>
                                <button
                                    onClick={() => setConfirmDelete(false)}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >取消</button>
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={() => setEditing(true)}
                                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setConfirmDelete(true)}
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
                        { label: '月費', value: `NT$${Math.round(sub.total_cost).toLocaleString()}` },
                        { label: `每人每${sub.collection_period_months}個月`, value: `NT$${Math.round(amount).toLocaleString()}` },
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
                                        amount={amount}
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

// --- Page ---

export default function SubscriptionsPage() {
    const { data: subs, mutate, isLoading } = useSWR<Subscription[]>(
        '/subscriptions/',
        fetchSubscriptions,
        { revalidateOnFocus: false }
    );
    const [showNew, setShowNew] = useState(false);

    const handleMutate = useCallback(() => { mutate(); }, [mutate]);

    const pendingCount = subs?.flatMap(s => s.cycles.flatMap(c => c.payments)).filter(p => !p.paid_at).length ?? 0;

    return (
        <div className="mx-auto max-w-2xl px-4 py-8 space-y-6 pb-24">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Yantage</p>
                    <h1 className="text-2xl font-bold tracking-tight">分帳訂閱</h1>
                    {pendingCount > 0 && (
                        <p className="text-xs text-amber-600 mt-1">共 {pendingCount} 筆待收款</p>
                    )}
                </div>
                <Button onClick={() => setShowNew(true)} className="mt-1">
                    <Plus className="w-4 h-4 mr-1.5" /> 新增訂閱
                </Button>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm">載入中…</span>
                </div>
            )}

            {!isLoading && subs?.length === 0 && (
                <div className="text-center py-16 space-y-2">
                    <p className="text-sm text-muted-foreground">尚無分帳訂閱</p>
                    <p className="text-xs text-muted-foreground">點擊「新增訂閱」開始管理</p>
                </div>
            )}

            <div className="space-y-4">
                {subs?.map(sub => (
                    <SubscriptionCard key={sub.id} sub={sub} onMutate={handleMutate} />
                ))}
            </div>

            {showNew && (
                <NewSubscriptionDialog
                    onClose={() => setShowNew(false)}
                    onSaved={handleMutate}
                />
            )}
        </div>
    );
}
