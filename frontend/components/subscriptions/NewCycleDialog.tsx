'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { createCollectionCycle } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import type { Subscription } from '@/lib/types';
import { todayStr } from './helpers';

export function NewCycleDialog({
    sub,
    onClose,
    onSaved,
}: {
    sub: Subscription;
    onClose: () => void;
    onSaved: () => void;
}) {
    const { toast } = useToast();
    const [cycleStart, setCycleStart] = useState(todayStr());
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await createCollectionCycle(sub.id, { cycle_start: cycleStart, note: note || undefined });
            onSaved();
            onClose();
        } catch {
            toast('新增週期失敗', 'error');
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
