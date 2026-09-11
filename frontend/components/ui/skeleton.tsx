'use client';

import { AlertTriangle } from 'lucide-react';

/**
 * Full-page error state shown when a SWR fetch fails.
 *
 * Usage:
 * ```tsx
 * const { isError, refresh } = useDashboard();
 * if (isError) return <PageError onRetry={refresh} />;
 * ```
 */
export function PageError({
    title,
    description,
    onRetry,
}: {
    title?: string;
    description?: string;
    onRetry?: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-24 px-6 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
                <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="flex flex-col gap-1.5">
                <p className="font-semibold text-foreground">{title ?? '無法載入資料'}</p>
                <p className="text-sm text-muted-foreground max-w-xs">{description ?? '請確認網路連線並重試。'}</p>
            </div>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="text-sm text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
                >
                    重試
                </button>
            )}
        </div>
    );
}
