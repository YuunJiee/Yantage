'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Eye, EyeOff, Settings, ArrowLeft, RefreshCw } from 'lucide-react';
import { usePrivacy } from '@/components/PrivacyProvider';
import { useState } from 'react';
import { API_URL } from '@/lib/api';
import { cn } from '@/lib/utils';

export function TopBar() {
    const { isPrivacyMode, togglePrivacyMode } = usePrivacy();
    const pathname = usePathname();
    const router = useRouter();
    const isHome = pathname === '/';
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        if (refreshing) return;
        setRefreshing(true);
        try {
            await fetch(`${API_URL}/system/refresh`, { method: 'POST' });
            router.refresh();
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <header className="sticky top-0 z-40 h-14 border-b border-border/60 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
            <div className="flex h-full items-center justify-between px-5">
                {isHome ? (
                    <span className="font-display italic text-[1.15rem] font-medium tracking-tight select-none">Yantage</span>
                ) : (
                    <Link
                        href="/"
                        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="返回首頁"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        返回
                    </Link>
                )}
                <div className="flex items-center gap-1">
                    {isHome && (
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                            aria-label="重整報價"
                        >
                            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                        </button>
                    )}
                    <button
                        onClick={togglePrivacyMode}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={isPrivacyMode ? '顯示數字' : '隱藏數字'}
                    >
                        {isPrivacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    {isHome && (
                        <Link
                            href="/settings"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label="設定"
                        >
                            <Settings className="h-4 w-4" />
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
