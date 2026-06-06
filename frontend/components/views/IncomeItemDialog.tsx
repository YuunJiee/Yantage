"use client";

import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from '@/components/ui/MoneyInput';
import { useState, useEffect } from "react";
import { IncomeItem } from "@/lib/types";
import { Trash2 } from "lucide-react";
import { createIncomeItem, updateIncomeItem, deleteIncomeItem } from "@/lib/api";

interface IncomeItemDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: () => void;
    editingItem?: IncomeItem | null;
}

export function IncomeItemDialog({ open, onOpenChange, onSave, editingItem }: IncomeItemDialogProps) {
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
        if (open && editingItem) {
            setName(editingItem.name);
            setAmount(editingItem.amount.toString());
        } else if (open) {
            setName("");
            setAmount("");
        }
    }, [open, editingItem]);

    const handleSave = async () => {
        if (!name || !amount) return;
        try {
            setLoading(true);
            if (editingItem) {
                await updateIncomeItem(editingItem.id, {
                    name,
                    amount: parseFloat(amount)
                });
            } else {
                await createIncomeItem({
                    name,
                    amount: parseFloat(amount)
                });
            }
            onSave();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to save income:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!editingItem) return;
        try {
            setLoading(true);
            await deleteIncomeItem(editingItem.id);
            onSave();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to delete income:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Sheet
            isOpen={open}
            onClose={() => onOpenChange(false)}
            title={editingItem ? '編輯收入' : '新增收入'}
        >
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="income-name">名稱</Label>
                    <Input
                        id="income-name"
                        placeholder="例如：薪資、兼職、助教..."
                        value={name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="income-amount">預期收入</Label>
                    <MoneyInput
                        id="income-amount"
                        value={amount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
                    />
                </div>
            </div>
            <div className="flex justify-between mt-4">
                {editingItem ? (
                    confirmDelete ? (
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
                        <Button variant="ghost" onClick={() => setConfirmDelete(true)} disabled={loading}
                            className="px-3 text-destructive/70 hover:text-destructive hover:bg-transparent">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )
                ) : <div></div>}
                <div className="space-x-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        取消
                    </Button>
                    <Button onClick={handleSave} disabled={loading || !name || !amount}>
                        {loading ? "..." : '儲存變更'}
                    </Button>
                </div>
            </div>
        </Sheet>
    );
}
