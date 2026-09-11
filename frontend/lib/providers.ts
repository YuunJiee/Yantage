import { Key, Globe, Bitcoin, Wallet, type LucideIcon } from 'lucide-react';

export interface ProviderInfo {
    id: string;
    label: string;
    defaultName: string;
    icon: LucideIcon;
    iconColor: string;
}

/** Single source of truth for the exchange/wallet providers the UI knows about. */
export const PROVIDERS: ProviderInfo[] = [
    { id: 'pionex', label: 'Pionex', defaultName: 'Pionex', icon: Key, iconColor: 'text-orange-500' },
    { id: 'binance', label: 'Binance', defaultName: 'Binance', icon: Bitcoin, iconColor: 'text-yellow-500' },
    { id: 'max', label: 'MAX Exchange', defaultName: 'MAX', icon: Globe, iconColor: 'text-blue-500' },
    { id: 'wallet', label: 'Web3 Wallet (EVM)', defaultName: 'Wallet', icon: Wallet, iconColor: 'text-purple-500' },
];

export function getProviderInfo(id: string): ProviderInfo | undefined {
    return PROVIDERS.find(p => p.id === id);
}
