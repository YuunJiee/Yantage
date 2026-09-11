import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { cn } from '@/lib/utils';
import type { IntegrationConnectionResponse } from '@/lib/api';
import type { AddAssetFormData } from './formState';

interface InvestmentDetailsFieldsProps {
    formData: AddAssetFormData;
    setFormData: (updater: (prev: AddAssetFormData) => AddAssetFormData) => void;
    market: string;
    source: string;
    setSource: (s: string) => void;
    connections: IntegrationConnectionResponse[];
    selectedConnectionId: string;
    setSelectedConnectionId: (id: string) => void;
    network: string;
    setNetwork: (n: string) => void;
    contractAddress: string;
    setContractAddress: (a: string) => void;
    decimals: string;
    setDecimals: (d: string) => void;
    fetchedPrice: number | null;
    onTickerBlur: () => void;
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">{children}</p>
);

/** Crypto/Stock-only fields: source toggle, Web3 wallet fields, ticker input with live price. */
export function InvestmentDetailsFields({
    formData,
    setFormData,
    market,
    source,
    setSource,
    connections,
    selectedConnectionId,
    setSelectedConnectionId,
    network,
    setNetwork,
    contractAddress,
    setContractAddress,
    decimals,
    setDecimals,
    fetchedPrice,
    onTickerBlur,
}: InvestmentDetailsFieldsProps) {
    return (
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
                            options={connections.map(c => ({ value: c.id.toString(), label: c.name || `連接 ${c.id}` }))} />
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
                        onChange={(e) => setFormData(prev => ({ ...prev, ticker: e.target.value }))}
                        onBlur={onTickerBlur}
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
    );
}
