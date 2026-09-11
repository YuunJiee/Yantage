interface ConfirmDeleteProps {
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
    label?: string;
    className?: string;
    textClassName?: string;
    confirmClassName?: string;
    cancelClassName?: string;
}

/** Inline "確定刪除？ / 確定 / 取消" prompt, shared by every delete-confirm affordance. */
export function ConfirmDelete({
    onConfirm,
    onCancel,
    loading = false,
    label = '確定刪除？',
    className = 'flex items-center gap-2',
    textClassName = 'text-sm text-destructive',
    confirmClassName = 'text-sm font-medium text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50',
    cancelClassName = 'text-sm text-muted-foreground hover:text-foreground transition-colors',
}: ConfirmDeleteProps) {
    return (
        <div className={className}>
            <span className={textClassName}>{label}</span>
            <button type="button" onClick={onConfirm} disabled={loading} className={confirmClassName}>
                {loading ? '刪除中…' : '確定'}
            </button>
            <button type="button" onClick={onCancel} className={cancelClassName}>
                取消
            </button>
        </div>
    );
}
