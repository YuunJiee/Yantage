import base64
import hashlib
import hmac
import json
import time


def sign_max_request(
    path: str, api_key: str, api_secret: str, params: dict | None = None
) -> tuple[dict, dict]:
    """Build the X-MAX-* auth headers MAX's API expects (base64-JSON-payload HMAC)."""
    nonce = int(time.time() * 1000)
    payload_data = {'nonce': nonce, 'path': path}
    if params:
        payload_data.update(params)
    payload = base64.b64encode(json.dumps(payload_data).encode()).decode()
    signature = hmac.new(api_secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    headers = {
        'X-MAX-ACCESSKEY': api_key,
        'X-MAX-PAYLOAD':   payload,
        'X-MAX-SIGNATURE': signature,
        'Content-Type':    'application/json',
    }
    return headers, payload_data


def sign_pionex_request(
    api_key: str, api_secret: str, method: str, path: str, params: dict | None = None
) -> tuple[dict, dict]:
    """Build the PIONEX-* auth headers Pionex's API expects (querystring HMAC)."""
    if params is None:
        params = {}
    params = {**params, 'timestamp': int(time.time() * 1000)}
    sorted_str = '&'.join(f"{k}={v}" for k, v in sorted(params.items()))
    payload = f"{method.upper()}{path}?{sorted_str}"
    signature = hmac.new(api_secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    headers = {'PIONEX-KEY': api_key, 'PIONEX-SIGNATURE': signature}
    return headers, params
