import { useState, useEffect } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateTransaction, deleteTransaction } from "@/lib/api";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Trash2 } from "lucide-react";

import type { Transaction } from '@/lib/types';

interface TransactionEditDialogProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction | null;
    onSuccess: () => void;
}

export function TransactionEditDialog({ isOpen, onClose, transaction, onSuccess }: TransactionEditDialogProps) {
    const [date, setDate] = useState("");
    const [amount, setAmount] = useState("");
    const [price, setPrice] = useState("");
    const [loading, setLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
        if (transaction) {
            const d = new Date(transaction.date || new Date());
            const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            setDate(localIso);
            setAmount(transaction.amount?.toString() || "0");
            setPrice(transaction.buy_price?.toString() || "0");
        }
    }, [transaction]);

    const handleSave = async () => {
        if (!transaction) return;
        setLoading(true);
        try {
            await updateTransaction(transaction.id, {
                date: new Date(date).toISOString(),
                amount: parseFloat(amount),
                buy_price: parseFloat(price)
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to update transaction", error);
            alert('更新交易失敗');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!transaction) return;
        setLoading(true);
        try {
            await deleteTransaction(transaction.id);
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to delete transaction", error);
            alert('刪除交易失敗');
        } finally {
            setLoading(false);
        }
    };

    if (!transaction) return null;

    return (
        <Sheet isOpen={isOpen} onClose={onClose} title="編輯交易">
            <div className="space-y-0">

                {/* ── 日期 ────────────────────────────────── */}
                <div className="pb-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">日期與時間</p>
                    <Input
                        type="datetime-local"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </div>

                {/* ── 數量 & 單價 ──────────────────────────── */}
                <div className="border-t border-border/20 py-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">金額</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">數量</p>
                            <MoneyInput
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="tabular-nums"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">單價</p>
                            <MoneyInput
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="tabular-nums"
                            />
                        </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-3">變更將直接反映於資產總額與淨值。</p>
                </div>

                {/* ── 操作 ────────────────────────────────── */}
                <div className="border-t border-border/20 pt-4 flex items-center justify-between">
                    {confirmDelete ? (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-destructive">確定刪除？</span>
                            <button type="button" onClick={handleDelete} disabled={loading}
                                className="text-sm font-medium text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50">
                                {loading ? '刪除中…' : '確定'}
                            </button>
                            <button type="button" onClick={() => setConfirmDelete(false)}
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                取消
                            </button>
                        </div>
                    ) : (
                        <button type="button" onClick={() => setConfirmDelete(true)} disabled={loading}
                            className="flex items-center gap-1.5 text-sm text-destructive/70 hover:text-destructive transition-colors disabled:opacity-50">
                            <Trash2 className="w-3.5 h-3.5" />
                            刪除
                        </button>
                    )}
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} disabled={loading}>取消</Button>
                        <Button onClick={handleSave} disabled={loading}>{loading ? '儲存中…' : '儲存'}</Button>
                    </div>
                </div>
            </div>
        </Sheet>
    );
}
