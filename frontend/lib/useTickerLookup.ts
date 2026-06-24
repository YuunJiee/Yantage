import { useState, useEffect } from 'react';
import { lookupTicker } from './api';

interface UseTickerLookupResult {
    fetchedPrice: number | null;
    clearPrice: () => void;
}

/**
 * Debounced ticker lookup for Stock / Crypto categories.
 * Calls onNameFetched / onPriceFetched once when the API returns data.
 */
export function useTickerLookup(
    ticker: string,
    category: string,
    market: string,
    onNameFetched: (name: string) => void,
    onPriceFetched: (price: number) => void,
): UseTickerLookupResult {
    const [fetchedPrice, setFetchedPrice] = useState<number | null>(null);

    useEffect(() => {
        if (!ticker || ticker.trim().length < 2) {
            setFetchedPrice(null);
            return;
        }
        if (category !== 'Stock' && category !== 'Crypto') return;

        let tickerToLookup = ticker;
        if (category === 'Stock' && market === 'TW' && !tickerToLookup.endsWith('.TW')) {
            tickerToLookup = `${tickerToLookup}.TW`;
        }
        if (category === 'Crypto' && !tickerToLookup.includes('-')) {
            tickerToLookup = `${tickerToLookup}-USD`;
        }

        const id = setTimeout(async () => {
            try {
                const result = await lookupTicker(tickerToLookup);
                if (result.name && !result.error) onNameFetched(result.name);
                if (result.price) {
                    setFetchedPrice(result.price);
                    onPriceFetched(result.price);
                } else {
                    setFetchedPrice(null);
                }
            } catch {
                setFetchedPrice(null);
            }
        }, 500);

        return () => clearTimeout(id);
    // onNameFetched / onPriceFetched are inline callbacks — exclude from deps to avoid loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ticker, category, market]);

    return { fetchedPrice, clearPrice: () => setFetchedPrice(null) };
}
