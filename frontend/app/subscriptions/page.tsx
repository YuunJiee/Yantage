'use client';

import { useState, useCallback } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscriptions } from '@/lib/hooks';
import { NewSubscriptionDialog } from '@/components/subscriptions/NewSubscriptionDialog';
import { SubscriptionCard } from '@/components/subscriptions/SubscriptionCard';
import { PageError } from '@/components/ui/skeleton';

export default function SubscriptionsPage() {
    const { subscriptions: subs, isLoading, isError, refresh } = useSubscriptions();
    const [showNew, setShowNew] = useState(false);

    const handleMutate = useCallback(() => { refresh(); }, [refresh]);

    const pendingCount = subs.flatMap(s => s.cycles.flatMap(c => c.payments)).filter(p => !p.paid_at).length;

    if (isError) return <PageError onRetry={refresh} />;

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

            {!isLoading && subs.length === 0 && (
                <div className="text-center py-16 space-y-2">
                    <p className="text-sm text-muted-foreground">尚無分帳訂閱</p>
                    <p className="text-xs text-muted-foreground">點擊「新增訂閱」開始管理</p>
                </div>
            )}

            <div className="space-y-4">
                {subs.map(sub => (
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
