import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast';
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from '@/components/ui/MoneyInput';
import { CustomSelect } from "@/components/ui/custom-select";
import { cn } from '@/lib/utils';
import { createAsset, createTransaction, lookupTicker, fetchIntegrations } from '@/lib/api';
import type { IntegrationConnection } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { IconPicker, getDefaultIcon } from './IconPicker';



interface AddAssetDialogProps {
    isOpen: boolean;
    onClose: () => void;
    defaultCategory?: string;
}

export function AddAssetDialog({ isOpen, onClose, defaultCategory }: AddAssetDialogProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        ticker: '',
        category: defaultCategory || 'Fluid',
        subCategory: '',
        initialBalance: '',
        includeInNetWorth: true,
        icon: '',
        manualAvgCost: '',
        paymentDueDay: ''
    });
    const [market, setMarket] = useState('TW'); // Default to Taiwan market
    const [fetchedPrice, setFetchedPrice] = useState<number | null>(null);

    // Web3 / Wallet State
    const [source, setSource] = useState('manual'); // manual, wallet
    const [connections, setConnections] = useState<IntegrationConnection[]>([]);
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

    const subCategories: Record<string, string[]> = {
        'Fluid': ['Cash', 'E-Wallet', 'Debit Card', 'Other'],
        'Crypto': ['Coin', 'Token', 'Stablecoin', 'DeFi', 'NFT'],
        'Stock': ['TW Stock', 'US Stock', 'ETF', 'Bond', 'Mutual Fund', 'Other Investment'],
        'Fixed': ['Real Estate', 'Car', 'Other Fixed Asset'],
        'Receivables': [],
        'Liabilities': ['Credit Card', 'Loan', 'Payable', 'Other Liability']
    };

    const getSubCategoryLabel = (key: string) => ({
        'Cash': '現金', 'E-Wallet': '電子錢包', 'Debit Card': '簽帳金融卡', 'Other': '其他',
        'Coin': '幣', 'Token': '代幣', 'Stablecoin': '穩定幣', 'DeFi': 'DeFi', 'NFT': 'NFT',
        'TW Stock': '台股', 'US Stock': '美股', 'Mutual Fund': '共同基金', 'Fund': '基金',
        'Stock': '股票', 'Crypto': '加密貨幣', 'Other Investment': '其他投資',
        'Real Estate': '房地產', 'Car': '車輛', 'Other Fixed Asset': '其他固定資產',
        'Credit Card': '信用卡', 'Loan': '貸款', 'Payable': '應付帳款', 'Other Liability': '其他負債'
    } as Record<string,string>)[key] ?? key;


    // Reset form and sync category when dialog opens
    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: '',
                ticker: '',
                category: defaultCategory || 'Fluid',
                subCategory: subCategories[defaultCategory || 'Fluid']?.[0] || '',
                initialBalance: '',
                includeInNetWorth: true,
                icon: '',
                manualAvgCost: '',
                paymentDueDay: ''
            });
            setMarket('TW');
            setFetchedPrice(null);

            // Web3 Reset
            setSource('manual');
            setSelectedConnectionId('');
            setNetwork('Ethereum');
            setContractAddress('');
            setDecimals('18');

            // Fetch integrations
            fetchIntegrations().then(data => {
                setConnections((data as IntegrationConnection[]).filter((c) => c.provider === 'wallet'));
            }).catch(console.error);
        }
    // subCategories is module-level const — stable, no need in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, defaultCategory]);

    // Auto-fetch ticker info when ticker is entered for stocks/crypto
    useEffect(() => {
        const fetchTickerInfo = async () => {
            if (!formData.ticker || formData.ticker.trim().length < 2) return;
            // Only Stock and Crypto have tickers
            if (formData.category !== 'Stock' && formData.category !== 'Crypto') return;

            try {
                let tickerToLookup = formData.ticker;

                // Add market suffix for Taiwan stocks
                if (formData.category === 'Stock' && market === 'TW') {
                    if (!tickerToLookup.endsWith('.TW')) {
                        tickerToLookup = `${tickerToLookup}.TW`;
                    }
                }

                // Add -USD for crypto
                if (formData.category === 'Crypto' && !tickerToLookup.includes('-')) {
                    tickerToLookup = `${tickerToLookup}-USD`;
                }

                const result = await lookupTicker(tickerToLookup);

                if (result.name && !result.error) {
                    // Auto-fill name if it's empty
                    setFormData(prev => ({
                        ...prev,
                        name: prev.name || result.name
                    }));
                }

                if (result.price) {
                    setFetchedPrice(result.price);
                    // Set manual avg cost default to fetched price if not already set
                    setFormData(prev => ({
                        ...prev,
                        manualAvgCost: result.price ? result.price.toString() : prev.manualAvgCost
                    }));
                } else {
                    setFetchedPrice(null);
                }
            } catch (error) {
                console.error('Failed to lookup ticker:', error);
                setFetchedPrice(null);
            }
        };

        // Debounce the API call
        const timeoutId = setTimeout(fetchTickerInfo, 500);
        return () => clearTimeout(timeoutId);
    }, [formData.ticker, formData.category, formData.subCategory, market]);

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

            router.refresh();
            onClose();
            toast('資產新增成功', 'success');
            setFormData({ name: '', ticker: '', category: 'Fluid', subCategory: '', initialBalance: '', includeInNetWorth: true, icon: '', manualAvgCost: '', paymentDueDay: '' });
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

    const SectionLabel = ({ children }: { children: React.ReactNode }) => (
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">{children}</p>
    );

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
                            onChange={(val) => setFormData({ ...formData, category: val, subCategory: subCategories[val]?.[0] || '' })}
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
                                options={(subCategories[formData.category] || []).map(sub => ({ value: sub, label: getSubCategoryLabel(sub) }))}
                            />
                        )}
                    </div>
                </div>

                {/* ── 投資詳情（股票/加密） ─────────────── */}
                {(formData.category === 'Stock' || formData.category === 'Crypto') && (
                    <div className="border-t border-border/20 py-5 space-y-4">
                        <SectionLabel>投資詳情</SectionLabel>

                        {/* Source toggle for Crypto */}
                        {formData.category === 'Crypto' && (
                            <div className="space-y-1.5">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">來源</p>
                                <div className="flex gap-1 rounded-xl border border-border/60 bg-muted/40 p-1 w-fit">
                                    {(['manual', 'wallet'] as const).map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => s !== 'wallet' || connections.length > 0 ? setSource(s) : undefined}
                                            disabled={s === 'wallet' && connections.length === 0}
                                            className={cn(
                                                'rounded-lg px-4 py-1.5 text-xs font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed',
                                                source === s
                                                    ? 'bg-background text-foreground shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            )}
                                        >
                                            {s === 'manual' ? '手動' : 'Web3 錢包'}
                                        </button>
                                    ))}
                                </div>
                                {connections.length === 0 && (
                                    <p className="text-[10px] text-muted-foreground">請先透過首頁加密貨幣列的連結圖示新增錢包整合。</p>
                                )}
                            </div>
                        )}

                        {/* Wallet fields */}
                        {source === 'wallet' && (
                            <div className="grid grid-cols-2 gap-3 pl-3 border-l-2 border-primary/20">
                                <div className="space-y-1.5">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">連接</p>
                                    <CustomSelect value={selectedConnectionId} onChange={setSelectedConnectionId}
                                        options={connections.map(c => ({ value: c.id.toString(), label: c.label ?? `連接 ${c.id}` }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">網路</p>
                                    <CustomSelect value={network} onChange={setNetwork}
                                        options={[
                                            { value: 'Ethereum', label: 'Ethereum' },
                                            { value: 'BSC', label: 'BSC' },
                                            { value: 'Scroll', label: 'Scroll' },
                                            { value: 'Arbitrum', label: 'Arbitrum' },
                                        ]} />
                                </div>
                                <div className="space-y-1.5 col-span-2">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">合約地址</p>
                                    <Input value={contractAddress} onChange={(e) => setContractAddress(e.target.value)} placeholder="0x..." className="font-mono text-xs" />
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">小數位數</p>
                                    <Input value={decimals} onChange={(e) => setDecimals(e.target.value)} placeholder="18" type="number" className="font-mono" />
                                </div>
                            </div>
                        )}

                        {/* Ticker */}
                        <div className="space-y-1.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
                                {formData.category === 'Crypto' ? '幣種代號' : '股票代號'}
                            </p>
                            <div className="relative">
                                <Input
                                    value={formData.ticker}
                                    onChange={(e) => { setFormData({ ...formData, ticker: e.target.value }); if (!e.target.value) setFetchedPrice(null); }}
                                    onBlur={handleTickerBlur}
                                    placeholder={market === 'TW' ? '例如：2330' : '例如：AAPL'}
                                    className="pr-28 font-mono uppercase"
                                />
                                {fetchedPrice !== null && (
                                    <div className="absolute right-3 inset-y-0 flex items-center">
                                        <span className="text-[10px] tabular-nums text-trend-up bg-trend-up-soft px-2 py-1 rounded-md">
                                            ${fetchedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
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
