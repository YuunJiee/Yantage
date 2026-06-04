import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from '@/components/ui/MoneyInput';
import { CustomSelect } from "@/components/ui/custom-select";
import { updateAsset, deleteAsset } from '@/lib/api';
import type { Asset } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Trash2, ArrowLeft } from 'lucide-react';
import { IconPicker, getDefaultIcon } from '../IconPicker';

interface EditAssetViewProps {
    asset: Asset | null;
    onClose: () => void;
    onBack?: () => void;
}

export function EditAssetView({ asset, onClose, onBack }: EditAssetViewProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState<{
        name: string;
        ticker: string;
        category: Asset['category'];
        subCategory: string;
        includeInNetWorth: boolean;
        icon: string;
        manualAvgCost: string | number;
        paymentDueDay: string | number;
    }>({
        name: '',
        ticker: '',
        category: 'Fluid',
        subCategory: '',
        includeInNetWorth: true,
        icon: '',
        manualAvgCost: 0,
        paymentDueDay: ''
    });

    // Tag Removal: Tag items removed.

    const subCategories: Record<string, string[]> = {
        'Fluid': ['Cash', 'E-Wallet', 'Debit Card', 'Other'],
        'Stock': ['TW Stock', 'US Stock', 'ETF', 'Bond', 'Mutual Fund', 'Other Investment'],
        'Crypto': ['Coin', 'Token', 'Stablecoin', 'DeFi', 'NFT'],
        'Fixed': ['Real Estate', 'Car', 'Other Fixed Asset'],
        'Receivables': [],
        'Liabilities': ['Credit Card', 'Loan', 'Payable', 'Other Liability']
    };

    const getSubCategoryLabel = (key: string) => ({
        'Cash': '現金', 'E-Wallet': '電子錢包', 'Debit Card': '簽帳金融卡', 'Other': '其他',
        'Coin': '幣', 'Token': '代幣', 'Stablecoin': '穩定幣', 'DeFi': 'DeFi', 'NFT': 'NFT',
        'TW Stock': '台股', 'US Stock': '美股', 'ETF': 'ETF', 'Bond': '債券',
        'Mutual Fund': '共同基金', 'Other Investment': '其他投資', 'Real Estate': '房地產',
        'Car': '車輛', 'Other Fixed Asset': '其他固定資產', 'Credit Card': '信用卡',
        'Loan': '貸款', 'Payable': '應付帳款', 'Other Liability': '其他負債'
    } as Record<string,string>)[key] ?? key;

    useEffect(() => {
        if (asset) {
            setFormData({
                name: asset.name,
                ticker: asset.ticker || '',
                category: asset.category,
                subCategory: asset.sub_category || '',
                includeInNetWorth: asset.include_in_net_worth !== undefined ? asset.include_in_net_worth : true,
                icon: asset.icon || '',
                manualAvgCost: asset.manual_avg_cost || '',
                paymentDueDay: asset.payment_due_day || ''
            });
            // setTags(asset.tags || []);
        }
    }, [asset]);

    const handleDelete = async () => {
        if (!asset) return;
        if (!confirm('您確定要刪除這項資產嗎？')) return;
        setLoading(true);
        try {
            await deleteAsset(asset.id);
            router.refresh();
            onClose();
        } catch {
            alert('Delete failed');
        } finally {
            setLoading(false);
        }
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!asset) return;
        setLoading(true);
        try {
            // Determine Name and Icon defaults
            const finalName = formData.name || formData.subCategory || "Asset";
            const finalIcon = formData.icon || getDefaultIcon(formData.category, formData.subCategory);

            await updateAsset(asset.id, {
                name: finalName,
                ticker: formData.ticker || null,
                category: formData.category,
                sub_category: formData.subCategory || null,
                include_in_net_worth: formData.includeInNetWorth,
                icon: finalIcon,
                manual_avg_cost: formData.manualAvgCost ? Number(formData.manualAvgCost) : null,
                payment_due_day: formData.category === 'Liabilities' && formData.paymentDueDay ? parseInt(formData.paymentDueDay as string) : null
            });



            router.refresh();
            onClose();
        } catch (error) {
            console.error("Failed to update asset", error);
            alert("Error updating asset");
        } finally {
            setLoading(false);
        }
    };

    if (!asset) return null;

    return (
        <div className="max-h-[80vh] overflow-y-auto px-1">
            <form onSubmit={handleSubmit} className="space-y-6">

                {asset.source === 'max' && (
                    <div className="bg-blue-500/10 text-blue-600 px-4 py-3 rounded-xl text-sm font-medium mb-4 flex items-center gap-2">
                        🔒 此資產由 MAX 整合自動管理，已停用手動編輯以確保數據一致性。
                    </div>
                )}

                <fieldset disabled={asset.source === 'max'} className="space-y-6 opacity-100 disabled:opacity-80">
                    {/* Name & Icon */}
                    <div className="flex gap-4 items-end">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">圖示</Label>
                            <IconPicker
                                value={formData.icon}
                                onChange={(icon) => setFormData({ ...formData, icon })}
                                defaultIcon={getDefaultIcon(formData.category, formData.subCategory)}
                            />
                        </div>
                        <div className="flex-1 space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">名稱</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    </div>

                    {formData.category !== 'Receivables' && (
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">子類別</Label>
                            <CustomSelect
                                value={formData.subCategory}
                                onChange={(val) => setFormData({ ...formData, subCategory: val })}
                                options={(subCategories[formData.category] || []).map(sub => ({ value: sub, label: getSubCategoryLabel(sub) }))}
                            />
                        </div>
                    )}

                    {(formData.category === 'Stock' || formData.category === 'Crypto') && (
                        <div className="flex gap-4">
                            <div className="space-y-2 flex-1">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">股票代號</Label>
                                <Input
                                    className="h-11 rounded-xl"
                                    value={formData.ticker}
                                    onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2 flex-1">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">平均成本 (TWD)</Label>
                                <MoneyInput
                                    className="h-11 rounded-xl"
                                    value={formData.manualAvgCost}
                                    onChange={(e) => setFormData({ ...formData, manualAvgCost: e.target.value })}
                                    placeholder="Optional"
                                />
                            </div>
                        </div>
                    )}

                    {formData.category === 'Liabilities' && (
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">繳費日期</Label>
                            <Input
                                type="number"
                                min="1"
                                max="31"
                                value={formData.paymentDueDay}
                                onChange={(e) => setFormData({ ...formData, paymentDueDay: e.target.value })}
                                placeholder="1-31"
                                className="tabular-nums h-11 rounded-xl"
                            />
                            <p className="text-[10px] text-muted-foreground pt-1">每月需繳費的日期。</p>
                        </div>
                    )}



                    <div className="pt-2 border-t border-border">
                        <div className="flex items-center space-x-3 py-2">
                            <input
                                type="checkbox"
                                id="editIncludeInNetWorth"
                                className="w-5 h-5 rounded-md border-gray-300 text-primary focus:ring-primary accent-primary"
                                checked={formData.includeInNetWorth}
                                onChange={(e) => setFormData({ ...formData, includeInNetWorth: e.target.checked })}
                            />
                            <label htmlFor="editIncludeInNetWorth" className="text-sm font-medium leading-none cursor-pointer">
                                計入淨值計算
                            </label>
                        </div>
                    </div>
                </fieldset>

                <div className="flex justify-between items-center pt-6">
                    <div className="flex gap-2">
                        {onBack && (
                            <Button type="button" variant="ghost" onClick={onBack}>
                                <ArrowLeft className="w-4 h-4 mr-1" /> 返回
                            </Button>
                        )}
                        {asset.source !== 'max' && (
                            <Button type="button" variant="ghost" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={handleDelete}>
                                <Trash2 className="w-4 h-4 mr-1" /> 刪除
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {/* <Button type="button" variant="ghost" onClick={onClose}>{t('cancel')}</Button> */}
                        {asset.source !== 'max' && (
                            <Button type="submit" disabled={loading}>
                                {loading ? '載入中...' : '儲存變更'}
                            </Button>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
}
