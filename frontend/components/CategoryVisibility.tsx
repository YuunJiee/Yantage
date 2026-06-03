'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch'; // Will check if this exists, else fallback
import { Label } from '@/components/ui/label';

import { fetchSetting, updateSetting } from '@/lib/api';

const ALL_CATEGORIES = ['Fluid', 'Stock', 'Crypto', 'Fixed', 'Receivables', 'Liabilities'];

const CATEGORY_ZH: Record<string, string> = {
    'Fluid': '流動資產', 'Stock': '股票', 'Crypto': '加密貨幣',
    'Fixed': '固定資產', 'Receivables': '應收帳款', 'Liabilities': '負債',
};

export function CategoryVisibility() {
    const [visibility, setVisibility] = useState<Record<string, boolean>>({
        'Fluid': true,
        'Stock': true,
        'Crypto': true,
        'Fixed': true,
        'Receivables': true,
        'Liabilities': true
    });

    useEffect(() => {
        fetchSetting('visible_categories')
            .then(data => {
                try {
                    const parsed = JSON.parse(data.value);
                    // Merge with defaults to ensure all keys exist
                    setVisibility(prev => ({ ...prev, ...parsed }));
                } catch (e) { console.error(e); }
            })
            .catch(() => {
                // Default: All true
            });
    }, []);

    const toggle = async (cat: string) => {
        const newVal = !visibility[cat];
        const newVisibility = { ...visibility, [cat]: newVal };
        setVisibility(newVisibility);

        try {
            await updateSetting('visible_categories', JSON.stringify(newVisibility));
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-4">
            {ALL_CATEGORIES.map(cat => (
                <div key={cat} className="flex items-center justify-between">
                    <Label htmlFor={`toggle-${cat}`} className="text-base">{CATEGORY_ZH[cat] ?? cat}</Label>
                    <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">{visibility[cat] ? '顯示' : '隱藏'}</Label>
                        <Switch
                            id={`toggle-${cat}`}
                            checked={visibility[cat]}
                            onCheckedChange={() => toggle(cat)}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
