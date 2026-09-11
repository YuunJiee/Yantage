/** Mirrors backend/utils/provider_rules.py::is_provider_managed — an asset
 * whose balance is owned by an automated provider sync (MAX/Binance/Pionex/
 * Wallet) must not be hand-edited anywhere in the UI, not just for MAX.
 * See docs/specs/assets-transactions.md R5/Decision 3. */
const MANAGED_PROVIDER_SOURCES = new Set(['max', 'binance', 'pionex', 'wallet']);

export function isProviderManaged(source?: string | null): boolean {
    return !!source && MANAGED_PROVIDER_SOURCES.has(source);
}
