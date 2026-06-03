'use client';

import { SWRConfig } from 'swr';
import { PrivacyProvider } from '@/components/PrivacyProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { GlobalThemeProvider } from '@/components/GlobalThemeProvider';
import { TopBar } from '@/components/TopBar';
import { ToastProvider } from '@/components/ui/toast';

export function ClientLayout({ children }: { children: React.ReactNode }) {
    return (
        <SWRConfig value={{
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 30000,
            errorRetryCount: 2,
        }}>
            <ThemeProvider
                attribute="class"
                forcedTheme="light"
                disableTransitionOnChange
            >
                <GlobalThemeProvider>
                    <PrivacyProvider>
                        <ToastProvider>
                            <div className="min-h-screen bg-background text-foreground">
                                <TopBar />
                                <main className="min-h-[calc(100vh-3.5rem)]">
                                    {children}
                                </main>
                            </div>
                        </ToastProvider>
                    </PrivacyProvider>
                </GlobalThemeProvider>
            </ThemeProvider>
        </SWRConfig>
    );
}
