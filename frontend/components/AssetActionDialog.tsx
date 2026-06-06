'use client';

import { useState, useEffect } from 'react';
import { Sheet } from '@/components/ui/sheet';
import { AssetHistoryView } from './views/AssetHistoryView';
import { EditAssetView } from './views/EditAssetView';
import { QuickAdjustView } from './views/QuickAdjustView';
import type { Asset } from '@/lib/types';

type DialogMode = 'history' | 'edit' | 'adjust';

interface AssetActionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Asset | null;
    allAssets?: Asset[];
    initialMode?: DialogMode;
}

interface DynamicContentProps {
    mode: DialogMode;
    asset: Asset | null;
    onClose: () => void;
    setMode: (mode: DialogMode) => void;
}

export function AssetActionDialog({ isOpen, onClose, asset, initialMode = 'history' }: AssetActionDialogProps) {
    const [mode, setMode] = useState(initialMode);

    useEffect(() => {
        if (!isOpen) return;
        setMode(initialMode);
    }, [isOpen, initialMode]);

    if (!asset) return null;

    const getTitle = () => {
        switch (mode) {
            case 'edit':   return '編輯資產';
            case 'adjust': return '調整餘額';
            default:       return asset?.name || '';
        }
    };

    return (
        <Sheet isOpen={isOpen} onClose={onClose} title={getTitle()}>
            <DynamicContent mode={mode} asset={asset} onClose={onClose} setMode={setMode} />
        </Sheet>
    );
}

function DynamicContent({ mode, asset, onClose, setMode }: DynamicContentProps) {
    switch (mode) {
        case 'edit':
            return (
                <EditAssetView
                    asset={asset}
                    onClose={onClose}
                    onBack={() => setMode('history')}
                />
            );
        case 'adjust':
            return asset ? (
                <QuickAdjustView
                    asset={asset}
                    onClose={onClose}
                    onBack={() => setMode('history')}
                />
            ) : null;
        case 'history':
        default:
            return (
                <AssetHistoryView
                    asset={asset}
                    onEdit={() => setMode('edit')}
                    onAdjustBalance={() => setMode('adjust')}
                />
            );
    }
}
