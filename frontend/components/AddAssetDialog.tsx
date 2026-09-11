import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast';
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from '@/components/ui/MoneyInput';
import { CustomSelect } from "@/components/ui/custom-select";
import { createAsset, createTransaction, fetchIntegrations, type IntegrationConnectionResponse } from '@/lib/api';
import { useTickerLookup } from '@/lib/useTickerLookup';
import { mutate } from 'swr';
import { SWR_KEYS } from '@/lib/hooks';
import { IconPicker, getDefaultIcon } from './IconPicker';
import { SUB_CATEGORIES, getSubCategoryLabel } from '@/lib/constants';
import { emptyAddAssetForm } from './AddAssetDialog/formState';
import { InvestmentDetailsFields } from './AddAssetDialog/InvestmentDetailsFields';
import { FormSectionLabel as SectionLabel } from './ui/section-label';

interface AddAssetDialogProps {
    isOpen: boolean;
    onClose: () => void;
    defaultCategory?: string;
}

export function AddAssetDialog({ isOpen, onClose, defaultCategory }: AddAssetDialogProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState(emptyAddAssetForm(defaultCategory));
    const [market, setMarket] = useState('TW');

    // Web3 / Wallet State
    const [source, setSource] = useState('manual'); // manual, wallet
    const [connections, setConnections] = useState<IntegrationConnectionResponse[]>([]);
    const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
    const [network, setNetwork] = useState('Ethereum');
    const [contractAddress, setContractAddress] = useState('');
    const [decimals, setDecimals] = useState('18');

    const categories = [
        { value: 'Fluid', label: '流動資產' },
        { value: 'Crypto', label: '加密貨幣' },
        { value: 'Stock', label: '股票' },
        { value: 'Fixed', label: '固定資產' },
        { value: 'Receivables', label: '應收帳款' },
        { value: 'Liabilities', label: '負債' },
    ];

    const { fetchedPrice, clearPrice } = useTickerLookup(
        formData.ticker,
        formData.category,
        market,
        (name) => setFormData(prev => ({ ...prev, name: prev.name || name })),
        (price) => setFormData(prev => ({ ...prev, manualAvgCost: prev.manualAvgCost || price.toString() })),
    );

    // Reset form and sync category when dialog opens
    useEffect(() => {
        if (isOpen) {
            setFormData({
                ...emptyAddAssetForm(defaultCategory),
                subCategory: SUB_CATEGORIES[defaultCategory || 'Fluid']?.[0] || '',
            });
            setMarket('TW');
            clearPrice();

            // Web3 Reset
            setSource('manual');
            setSelectedConnectionId('');
            setNetwork('Ethereum');
            setContractAddress('');
            setDecimals('18');

            // Fetch integrations
            fetchIntegrations().then(data => {
                setConnections(data.filter((c) => c.provider === 'wallet'));
            }).catch(console.error);
        }
    }, [isOpen, defaultCategory]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let finalTicker = formData.ticker;

            // Handle Taiwan Stocks
            if (formData.category === 'Stock' && market === 'TW') {
                if (finalTicker && !finalTicker.endsWith('.TW')) {
                    finalTicker = `${finalTicker}.TW`;
                }
            }

            // Handle Crypto (Append -USD)
            if (formData.category === 'Crypto') {
                if (finalTicker && !finalTicker.includes('-')) {
                    finalTicker = `${finalTicker}-USD`;
                }
            }


            // Determine Name and Icon defaults
            const finalName = formData.name || formData.subCategory || "New Asset";
            const finalIcon = formData.icon || getDefaultIcon(formData.category, formData.subCategory);

            const assetRes = await createAsset({
                name: finalName,
                ticker: finalTicker || null,
                category: formData.category,
                sub_category: formData.subCategory || null,
                include_in_net_worth: formData.includeInNetWorth,
                icon: finalIcon,
                current_price: fetchedPrice,
                payment_due_day: formData.paymentDueDay ? parseInt(formData.paymentDueDay) : null,

                // Web3 Fields
                source: source,
                connection_id: source === 'wallet' && selectedConnectionId ? parseInt(selectedConnectionId) : undefined,
                network: source === 'wallet' ? network : undefined,
                contract_address: source === 'wallet' ? contractAddress : undefined,
                decimals: source === 'wallet' ? parseInt(decimals) : 18
            });

            const initialBalance = parseFloat(formData.initialBalance);
            if (initialBalance && !isNaN(initialBalance) && initialBalance !== 0) {
                // Use manual avg cost if provided, otherwise fetched price, otherwise 0/1
                const buyPrice = formData.manualAvgCost ? parseFloat(formData.manualAvgCost) : (fetchedPrice || (formData.ticker ? 0 : 1.0));

                await createTransaction(assetRes.id, {
                    amount: initialBalance,
                    buy_price: buyPrice,
                    date: new Date().toISOString(),
                });
            }

            mutate(SWR_KEYS.dashboard);
            onClose();
            toast('資產新增成功', 'success');
            setFormData(emptyAddAssetForm());
            setMarket('TW');
        } catch (error) {
            console.error("Failed to create asset", error);
            toast('新增資產失敗', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Auto-fix ticker formatting on blur
    const handleTickerBlur = () => {
        let currentTicker = formData.ticker;
        if (!currentTicker) return;

        // Auto-fix Crypto Ticker
        if (formData.category === 'Crypto' && !currentTicker.includes('-')) {
            currentTicker = `${currentTicker}-USD`;
            setFormData(prev => ({ ...prev, ticker: currentTicker }));
        }

        // Auto-fix TW Stock Ticker if it's 4 digits
        if (formData.category === 'Stock' && market === 'TW' && /^\d{4}$/.test(currentTicker)) {
            setFormData(prev => ({ ...prev, ticker: `${currentTicker}.TW` }));
        }

        // Auto-set name if empty using Contract Address (Simple heuristic or just allow user)
    };

    // Calc default icon for preview
    const defaultIconPreview = getDefaultIcon(formData.category, formData.subCategory);

    return (
        <Sheet isOpen={isOpen} onClose={onClose} title="新增資產">
            <form onSubmit={handleSubmit} className="space-y-0">

                {/* ── 名稱 & 圖示 ───────────────────────── */}
                <div className="pb-5">
                    <div className="flex gap-3 items-end">
                        <div className="space-y-1.5 shrink-0">
                            <SectionLabel>圖示</SectionLabel>
                            <IconPicker
                                value={formData.icon}
                                onChange={(icon) => setFormData({ ...formData, icon })}
                                defaultIcon={defaultIconPreview}
                            />
                        </div>
                        <div className="flex-1 space-y-1.5">
                            <SectionLabel>名稱</SectionLabel>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder={
                                    formData.category === 'Fluid' ? '例如：我的銀行帳戶' :
                                    formData.category === 'Stock' ? '例如：台積電' :
                                    formData.category === 'Crypto' ? 'Bitcoin' : '資產名稱'
                                }
                            />
                        </div>
                    </div>
                </div>

                {/* ── 分類 ──────────────────────────────── */}
                <div className="border-t border-border/20 py-5">
                    <SectionLabel>分類</SectionLabel>
                    <div className="grid grid-cols-2 gap-3">
                        <CustomSelect
                            value={formData.category}
                            onChange={(val) => setFormData({ ...formData, category: val, subCategory: SUB_CATEGORIES[val]?.[0] || '' })}
                            options={categories}
                        />
                        {formData.category !== 'Receivables' && (
                            <CustomSelect
                                value={formData.subCategory}
                                onChange={(val) => {
                                    setFormData({ ...formData, subCategory: val });
                                    if (val === 'TW Stock') setMarket('TW');
                                    if (val === 'US Stock' || val === 'Mutual Fund') setMarket('US');
                                }}
                                options={(SUB_CATEGORIES[formData.category] || []).map(sub => ({ value: sub, label: getSubCategoryLabel(sub) }))}
                            />
                        )}
                    </div>
                </div>

                {/* ── 投資詳情（股票/加密） ─────────────── */}
                {(formData.category === 'Stock' || formData.category === 'Crypto') && (
                    <InvestmentDetailsFields
                        formData={formData}
                        setFormData={setFormData}
                        market={market}
                        source={source}
                        setSource={setSource}
                        connections={connections}
                        selectedConnectionId={selectedConnectionId}
                        setSelectedConnectionId={setSelectedConnectionId}
                        network={network}
                        setNetwork={setNetwork}
                        contractAddress={contractAddress}
                        setContractAddress={setContractAddress}
                        decimals={decimals}
                        setDecimals={setDecimals}
                        fetchedPrice={fetchedPrice}
                        onTickerBlur={handleTickerBlur}
                    />
                )}

                {/* ── 持倉 & 成本 ───────────────────────── */}
                <div className="border-t border-border/20 py-5">
                    <SectionLabel>
                        {formData.category === 'Stock' ? '持股' :
                         formData.category === 'Crypto' ? '持倉' : '初始金額'}
                    </SectionLabel>
                    <div className="grid grid-cols-2 gap-3">
                        <div className={`space-y-1.5 ${formData.category !== 'Stock' && formData.category !== 'Crypto' ? 'col-span-2' : ''}`}>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
                                {formData.category === 'Stock' ? '股數' :
                                 formData.category === 'Crypto' ? '數量' : '金額'}
                            </p>
                            <MoneyInput
                                className="tabular-nums"
                                value={formData.initialBalance}
                                onChange={(e) => setFormData({ ...formData, initialBalance: e.target.value })}
                                placeholder="例如：1000"
                            />
                            {fetchedPrice !== null && formData.initialBalance && !isNaN(parseFloat(formData.initialBalance)) && (
                                <p className="text-[10px] text-muted-foreground text-right">
                                    ≈ <span className="font-medium text-foreground tabular-nums">
                                        ${(fetchedPrice * parseFloat(formData.initialBalance)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </span>
                                </p>
                            )}
                        </div>

                        {(formData.category === 'Stock' || formData.category === 'Crypto') && (
                            <div className="space-y-1.5">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">平均成本</p>
                                <MoneyInput
                                    value={formData.manualAvgCost}
                                    onChange={(e) => setFormData({ ...formData, manualAvgCost: e.target.value })}
                                    placeholder={fetchedPrice ? `${fetchedPrice}` : '例如：100'}
                                    className="tabular-nums"
                                />
                                <p className="text-[10px] text-muted-foreground">依目前市價預填，可修改。</p>
                            </div>
                        )}

                        {formData.category === 'Liabilities' && (
                            <div className="space-y-1.5">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">繳費日（每月）</p>
                                <Input
                                    type="number" min="1" max="31"
                                    value={formData.paymentDueDay}
                                    onChange={(e) => setFormData({ ...formData, paymentDueDay: e.target.value })}
                                    placeholder="1–31"
                                    className="tabular-nums"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* ── 設定 & 送出 ───────────────────────── */}
                <div className="border-t border-border/20 pt-4 flex items-center justify-between">
                    <label htmlFor="includeInNetWorth" className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            id="includeInNetWorth"
                            className="w-4 h-4 rounded border-border text-primary accent-primary focus:ring-0"
                            checked={formData.includeInNetWorth}
                            onChange={(e) => setFormData({ ...formData, includeInNetWorth: e.target.checked })}
                        />
                        <span className="text-sm text-muted-foreground">計入淨值計算</span>
                    </label>
                    <Button type="submit" disabled={loading}>
                        {loading ? '新增中…' : '新增資產'}
                    </Button>
                </div>
            </form>
        </Sheet>
    );
}
