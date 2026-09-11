from ..constants import Provider

MANAGED_PROVIDER_SOURCES = {p.value for p in Provider if p != Provider.MANUAL}


def is_provider_managed(source: str | None) -> bool:
    """Whether an asset's balance is owned by an automated provider sync
    (MAX/Binance/Pionex/Wallet), and so must not be hand-edited — the next
    sync pass would silently overwrite a manual change anyway."""
    return source in MANAGED_PROVIDER_SOURCES
