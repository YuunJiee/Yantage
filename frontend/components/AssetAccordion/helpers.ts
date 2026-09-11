import type { Asset } from '@/lib/types';

/** Falls back to current_price × summed transaction quantity when value_twd isn't set (or is exactly 0). */
export function getAssetDisplayValue(asset: Asset): number {
    if (asset.value_twd !== undefined && asset.value_twd !== 0) return asset.value_twd;
    const qty = asset.transactions?.reduce((acc, t) => acc + t.amount, 0) ?? 0;
    return (asset.current_price || 0) * qty;
}
