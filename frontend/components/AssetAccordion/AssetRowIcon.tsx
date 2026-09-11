import { AssetIcon } from '../IconPicker';
import { getCategoryIconName } from '@/lib/iconHelper';

/** The icon-box shared by every row shape in AssetAccordion (flat asset, web3 group header). */
export function AssetRowIcon({
    icon,
    category,
    subCategory,
}: {
    icon?: string | null;
    category: string;
    subCategory?: string | null;
}) {
    return (
        <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
            {icon ? (
                <AssetIcon icon={icon} className="w-4 h-4" />
            ) : (
                <AssetIcon icon={getCategoryIconName(category, subCategory ?? undefined)} className="w-4 h-4" />
            )}
        </div>
    );
}
