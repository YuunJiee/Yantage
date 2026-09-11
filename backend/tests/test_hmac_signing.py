import hashlib
import hmac
import json
import base64

from backend.utils.hmac_signing import sign_max_request, sign_pionex_request


def test_sign_max_request_headers_shape():
    headers, payload_data = sign_max_request("/api/v3/wallet/spot/accounts", "key123", "secret456")

    assert headers["X-MAX-ACCESSKEY"] == "key123"
    assert headers["Content-Type"] == "application/json"
    assert payload_data["path"] == "/api/v3/wallet/spot/accounts"
    assert "nonce" in payload_data

    expected_payload = base64.b64encode(json.dumps(payload_data).encode()).decode()
    assert headers["X-MAX-PAYLOAD"] == expected_payload
    expected_sig = hmac.new(b"secret456", expected_payload.encode(), hashlib.sha256).hexdigest()
    assert headers["X-MAX-SIGNATURE"] == expected_sig


def test_sign_max_request_merges_extra_params():
    _, payload_data = sign_max_request("/path", "key", "secret", {"market": "btctwd", "limit": 500})
    assert payload_data["market"] == "btctwd"
    assert payload_data["limit"] == 500


def test_sign_pionex_request_headers_shape():
    headers, params = sign_pionex_request("key123", "secret456", "GET", "/api/v1/account/balances")

    assert headers["PIONEX-KEY"] == "key123"
    assert "timestamp" in params

    sorted_str = '&'.join(f"{k}={v}" for k, v in sorted(params.items()))
    payload = f"GET/api/v1/account/balances?{sorted_str}"
    expected_sig = hmac.new(b"secret456", payload.encode(), hashlib.sha256).hexdigest()
    assert headers["PIONEX-SIGNATURE"] == expected_sig


def test_sign_pionex_request_merges_extra_params():
    _, params = sign_pionex_request("key", "secret", "GET", "/path", {"market": "BTC_USDT"})
    assert params["market"] == "BTC_USDT"
    assert "timestamp" in params
