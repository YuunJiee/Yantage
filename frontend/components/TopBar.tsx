'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Eye, EyeOff, Settings, ArrowLeft } from 'lucide-react';
import { usePrivacy } from '@/components/PrivacyProvider';

export function TopBar() {
    const { isPrivacyMode, togglePrivacyMode } = usePrivacy();
    const pathname = usePathname();
    const isHome = pathname === '/';

    return (
        <header className="sticky top-0 z-40 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-full items-center justify-between px-5">
                {isHome ? (
                    <span className="text-base font-semibold tracking-tight">Yantage</span>
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
