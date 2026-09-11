'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrivateMoney } from '@/lib/usePrivateMoney';
import type { CyclePayment } from '@/lib/types';
import { formatDate } from './helpers';

export function PaymentRow({
    payment,
    onToggle,
}: {
    payment: CyclePayment;
    onToggle: (payment: CyclePayment) => Promise<void>;
}) {
    const privateMoney = usePrivateMoney();
    const [toggling, setToggling] = useState(false);
    const paid = !!payment.paid_at;

    const handleToggle = async () => {
        setToggling(true);
        try {
            await onToggle(payment);
        } finally {
            setToggling(false);
        }
    };

    return (
        <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2.5">
                <button
                    onClick={handleToggle}
                    disabled={toggling}
                    className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors disabled:opacity-50',
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
                    {privateMoney(payment.amount, '••••', { maximumFractionDigits: 0 })}
                </span>
                {paid && payment.paid_at && (
                    <div className="text-[10px] text-muted-foreground">{formatDate(payment.paid_at)}</div>
                )}
            </div>
        </div>
    );
}
