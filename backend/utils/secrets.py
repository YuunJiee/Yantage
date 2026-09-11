def mask_api_key_ends(key: str | None) -> str | None:
    """Show only the first/last 4 chars of a connection API key, e.g. 'abcd...wxyz'."""
    if not key:
        return None
    return f"{key[:4]}...{key[-4:]}" if len(key) > 8 else "****"


def mask_secret_tail(value: str | None) -> str:
    """Show only the last 4 chars of a stored settings value, e.g. '********wxyz'."""
    return "********" + value[-4:] if value and len(value) > 4 else "********"
