import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, ArrowRightLeft, Pencil, Wallet } from 'lucide-react';
import type { Asset } from '@/lib/types';

interface AssetHistoryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Asset | null;
    onEdit?: () => void;
    onAdjustBalance?: () => void;
}

export function AssetHistoryView({ asset, onEdit, onAdjustBalance }: Omit<AssetHistoryDialogProps, 'isOpen' | 'onClose'>) {
    if (!asset) return null;

    const sortedTransactions = [...(asset.transactions || [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const transactionsWithBalance = sortedTransactions
        .slice()
        .reverse()
        .reduce<(typeof sortedTransactions[number] & { balance: number })[]>((acc, tx) => {
            const prev = acc.length > 0 ? acc[acc.length - 1].balance : 0;
            acc.push({ ...tx, balance: prev + tx.amount });
            return acc;
        }, [])
        .reverse();

    const totalQuantity = asset.transactions?.reduce((sum, tx) => sum + tx.amount, 0) || 0;
    const totalValue = (asset.current_price ?? 0) * totalQuantity;
    const isCrypto = asset.sub_category?.includes('Crypto');

    const isManaged = ['max', 'pionex', 'binance'].includes(asset['source'] || '');

    return (
        <div className="space-y-5">
            {/* Action toolbar */}
            <div className="flex items-center justify-between">
                {isManaged ? (
                    <span className="text-xs text-muted-foreground">由整合自動管理</span>
                ) : (
                    <span />
                )}
                {!isManaged && (
                    <div className="flex gap-1.5 ml-auto">
                        <button
                            onClick={onAdjustBalance}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                            <Wallet className="w-3.5 h-3.5" />
                            調整
                        </button>
                        <button
                            onClick={onEdit}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                            編輯
                        </button>
                    </div>
                )}
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 divide-x divide-border/50 pb-4 border-b border-border/50">
                <div className="pr-4">
                    <div className="text-xs text-muted-foreground mb-1">目前持倉</div>
                    <div className="font-display text-xl font-medium tabular-nums">
                        {totalQuantity.toLocaleString(undefined, {
                            minimumFractionDigits: isCrypto ? 8 : 0,
                            maximumFractionDigits: isCrypto ? 8 : 2
                        })}
                    </div>
                </div>
                <div className="pl-4">
                    <div className="text-xs text-muted-foreground mb-1">市值 (TWD)</div>
                    <div className="font-display text-xl font-medium tabular-nums">
                        ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                </div>
                {asset.ticker && (
                    <div className="col-span-2 pt-2 mt-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">代號</span>
                        <span className="text-xs font-medium tabular-nums">{asset.ticker}</span>
                    </div>
                )}
            </div>

            {/* Transaction list */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">交易紀錄</h3>
                    <span className="text-xs text-muted-foreground">{sortedTransactions.length} 筆</span>
                </div>

                {sortedTransactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">尚無交易紀錄</p>
                ) : (
                    <div className="divide-y divide-border/50 max-h-[35vh] md:max-h-96 overflow-y-auto">
                        {transactionsWithBalance.map((tx) => {
                            const isPositive = tx.amount > 0;
                            const isTransfer = tx.is_transfer;

                            return (
                                <div key={tx.id} className="flex items-center justify-between py-2.5">
                                    <div className="flex items-center gap-2.5">
                                        {isTransfer ? (
                                            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                        ) : isPositive ? (
                                            <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        ) : (
                                            <TrendingDown className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                        )}
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className={cn(
                                                    'text-sm font-semibold tabular-nums',
                                                    isPositive ? 'text-emerald-600' : 'text-red-500'
                                                )}>
                                                    {isPositive ? '+' : ''}{tx.amount.toLocaleString(undefined, {
                                                        minimumFractionDigits: isCrypto ? 8 : 0,
                                                        maximumFractionDigits: isCrypto ? 8 : 2
                                                    })}
                                                </span>
                                                {isTransfer && (
                                                    <span className="text-[10px] text-blue-500 font-medium">轉移</span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground">
                                                {new Date(tx.date).toLocaleDateString()} · 餘額 {tx.balance.toLocaleString(undefined, {
                                                    minimumFractionDigits: isCrypto ? 8 : 0,
                                                    maximumFractionDigits: isCrypto ? 8 : 2
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    {!isTransfer && tx.buy_price > 0 && (
                                        <div className="text-right shrink-0">
                                            <div className="text-xs text-muted-foreground">成本</div>
                                            <div className="text-xs font-medium tabular-nums">
                                                {tx.buy_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
