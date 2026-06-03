'use client';

import React, { createContext, useContext, useState } from 'react';

interface PrivacyContextType {
    isPrivacyMode: boolean;
    togglePrivacyMode: () => void;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
    const [isPrivacyMode, setIsPrivacyMode] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('privacy-mode') === 'true';
    });

    const togglePrivacyMode = () => {
        setIsPrivacyMode(prev => {
            const newValue = !prev;
            localStorage.setItem('privacy-mode', String(newValue));
            return newValue;
        });
    };

    return (
        <PrivacyContext.Provider value={{ isPrivacyMode, togglePrivacyMode }}>
            {children}
        </PrivacyContext.Provider>
    );
}

export function usePrivacy() {
    const context = useContext(PrivacyContext);
    if (context === undefined) {
        throw new Error('usePrivacy must be used within a PrivacyProvider');
    }
    return context;
}
