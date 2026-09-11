'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { createSubscription } from '@/lib/api';

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

export function NewSubscriptionDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
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
