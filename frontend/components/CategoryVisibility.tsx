'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

import { useCategoryVisibility } from '@/lib/hooks';
import { DASHBOARD_CATEGORY_ORDER, CATEGORY_ZH } from '@/lib/constants';

export function CategoryVisibility() {
    const { visibility, toggle } = useCategoryVisibility();

    return (
        <div className="space-y-4">
            {DASHBOARD_CATEGORY_ORDER.map(cat => (
                <div key={cat} className="flex items-center justify-between">
                    <Label htmlFor={`toggle-${cat}`} className="text-base">{CATEGORY_ZH[cat] ?? cat}</Label>
                    <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">{visibility[cat] !== false ? '顯示' : '隱藏'}</Label>
                        <Switch
                            id={`toggle-${cat}`}
                            checked={visibility[cat] !== false}
                            onCheckedChange={() => toggle(cat)}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
