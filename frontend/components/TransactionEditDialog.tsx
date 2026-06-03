import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateTransaction, deleteTransaction } from "@/lib/api";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Trash2, AlertCircle } from "lucide-react";

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

    useEffect(() => {
        if (transaction) {
            // Format date for input datetime-local
            const d = new Date(transaction.date || new Date());
            // Adjust to local ISO string somewhat manually for local input
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
        if (!confirm('您確定要刪除這筆交易嗎？此操作無法復原。')) return;
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
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="編輯交易"
            className="sm:max-w-md"
        >
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>日期與時間</Label>
                    <Input
                        type="datetime-local"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>數量 (Amount)</Label>
                        <MoneyInput
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>單價 (Unit Cost)</Label>
                        <MoneyInput
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                        />
                    </div>
                </div>

                <div className="text-xs text-muted-foreground bg-muted p-2 rounded flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    變更將直接反映於資產總額與淨值。
                </div>
            </div>

            <div className="flex justify-between sm:justify-between items-center w-full mt-4">
                <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={loading}
                    className="aspect-square p-2"
                    title="刪除"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={onClose} disabled={loading}>取消</Button>
                    <Button onClick={handleSave} disabled={loading}>{loading ? '儲存中...' : '儲存'}</Button>
                </div>
            </div>
        </Dialog>
    );
}
