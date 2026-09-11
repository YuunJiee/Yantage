'use client';

import { useState } from 'react';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { ConfirmDelete } from '@/components/ui/confirm-delete';
import type { CollectionCycle, CyclePayment } from '@/lib/types';
import { formatDate } from './helpers';
import { PaymentRow } from './PaymentRow';

export function CycleCard({
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
                            <ConfirmDelete
                                onConfirm={onDelete}
                                onCancel={() => setConfirmDelete(false)}
                                className="flex items-center gap-2"
                                textClassName="text-[11px] text-red-500"
                                confirmClassName="text-[11px] font-medium text-red-500 hover:text-red-600 transition-colors"
                                cancelClassName="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                            />
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
