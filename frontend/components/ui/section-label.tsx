import type { ReactNode } from 'react';

/** Page/section-level header label (e.g. "設定", "每月預期收入"). */
export function SectionLabel({ children }: { children: ReactNode }) {
    return (
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {children}
        </h2>
    );
}

/** Tighter label for a field group inside a form/Sheet (e.g. "圖示", "分類"). */
export function FormSectionLabel({ children }: { children: ReactNode }) {
    return (
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">
            {children}
        </p>
    );
}
