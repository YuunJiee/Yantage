'use client';

import { useState } from 'react';

/** Shared loading/error/try-catch shape every dialog's submit handler reimplemented separately. */
export function useFormSubmit<T extends unknown[]>(fn: (...args: T) => Promise<void>) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (...args: T) => {
        setLoading(true);
        setError(null);
        try {
            await fn(...args);
        } catch (e) {
            setError(e instanceof Error ? e.message : '發生錯誤');
        } finally {
            setLoading(false);
        }
    };

    return { submit, loading, error, setError };
}
