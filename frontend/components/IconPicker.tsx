'use client';

import * as Icons from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface IconPickerProps {
    value?: string;
    onChange: (icon: string) => void;
    className?: string;
    iconClassName?: string;
    defaultIcon?: string;
}

const COMMON_ICONS = [
    'Wallet', 'CreditCard', 'Building', 'Banknote', 'Bitcoin', 'DollarSign',
    'PiggyBank', 'TrendingUp', 'Smartphone', 'Home', 'Car', 'Watch',
    'Gem', 'Briefcase', 'GraduationCap', 'Landmark', 'Coins', 'Receipt',
    'ShoppingBag', 'Gift', 'Plane', 'Coffee', 'Music', 'Camera', 'Code',
    'Cpu', 'Database', 'Key', 'Lock', 'Shield', 'Zap', 'Star', 'Heart'
];

export function IconPicker({ value, onChange, className, iconClassName, defaultIcon }: IconPickerProps) {
    const [search, setSearch] = useState('');

    // Normalize value
    const selectedIcon = value || '';

    const filteredIcons = COMMON_ICONS.filter(name =>
        name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "flex items-center justify-center h-10 w-10 rounded-xl bg-muted border border-border hover:bg-muted/80 transition-colors shrink-0",
                        className
                    )}
                    title="Change Icon"
                >
                    {selectedIcon ? (
                        <AssetIcon icon={selectedIcon} className={cn("w-5 h-5", iconClassName)} />
                    ) : defaultIcon ? (
                        <AssetIcon icon={defaultIcon} className={cn("w-5 h-5 text-muted-foreground/70", iconClassName)} />
                    ) : (
                        <Icons.Image className={cn("w-5 h-5 text-muted-foreground/30", iconClassName)} />
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-3 bg-card border-border" align="start">
                <div className="mb-3">
                    <Input
                        placeholder="搜尋圖示..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="h-9 text-sm"
                    />
                </div>
                <div className="grid grid-cols-5 gap-2 max-h-[220px] overflow-y-auto">
                    {filteredIcons.map(name => {
                        const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
                        if (!Icon) return null;

                        const isSelected = selectedIcon === name;

                        return (
                            <button
                                key={name}
                                type="button"
                                onClick={() => onChange(name)}
                                className={cn(
                                    "flex items-center justify-center p-2.5 rounded-xl transition-all hover:bg-muted",
                                    isSelected ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                                )}
                                title={name}
                            >
                                <Icon className="w-5 h-5" />
                            </button>
                        );
                    })}
                </div>
                {filteredIcons.length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-3">找不到圖示</div>
                )}
            </PopoverContent>
        </Popover>
    );
}

// Helper to get default icon based on category/subcategory
export function getDefaultIcon(category: string, subCategory: string = ''): string {
    const sub = (subCategory || '').toLowerCase();
    const cat = (category || '').toLowerCase();

    if (cat === 'fluid') {
        if (sub.includes('bank') || sub.includes('cash')) return 'Landmark';
        if (sub.includes('wallet')) return 'Wallet';
        if (sub.includes('card')) return 'CreditCard';
        return 'Banknote';
    }
    if (cat === 'investment') {
        if (sub.includes('stock')) return 'TrendingUp';
        if (sub.includes('crypto')) return 'Bitcoin';
        if (sub.includes('fund')) return 'PieChart';
        return 'Gem';
    }
    if (cat === 'fixed') {
        if (sub.includes('estate') || sub.includes('house')) return 'Home';
        if (sub.includes('car')) return 'Car';
        return 'Building';
    }
    if (cat === 'liabilities') {
        if (sub.includes('card')) return 'CreditCard';
        return 'Receipt';
    }
    return 'CircleDollarSign';
}

export function AssetIcon({ icon, className }: { icon?: string | null, className?: string }) {
    if (!icon) return null;
    const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[icon];
    if (!Icon) return null;
    return <Icon className={className} />;
}
