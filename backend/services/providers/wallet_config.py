import json

ERC20_ABI = json.loads('[{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"}]')

NETWORKS = {
    'Ethereum': 'https://rpc.ankr.com/eth',
    'Scroll':   'https://rpc.scroll.io',
    'BSC':      'https://bsc-dataseed.binance.org/',
    'Arbitrum': 'https://arb1.arbitrum.io/rpc',
}

POPULAR_TOKENS = {
    'Ethereum': [
        {'symbol': 'USDT',  'address': '0xdac17f958d2ee523a2206206994597c13d831ec7', 'decimals': 6},
        {'symbol': 'USDC',  'address': '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 'decimals': 6},
        {'symbol': 'DAI',   'address': '0x6b175474e89094c44da98b954eedeac495271d0f', 'decimals': 18},
        {'symbol': 'WBTC',  'address': '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', 'decimals': 8},
        {'symbol': 'SHIB',  'address': '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce', 'decimals': 18},
        {'symbol': 'LINK',  'address': '0x514910771af9ca656af840dff83e8264ecf986ca', 'decimals': 18},
        {'symbol': 'UNI',   'address': '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', 'decimals': 18},
    ],
    'BSC': [
        {'symbol': 'USDT',  'address': '0x55d398326f99059ff775485246999027b3197955', 'decimals': 18},
        {'symbol': 'USDC',  'address': '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', 'decimals': 18},
        {'symbol': 'DAI',   'address': '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3', 'decimals': 18},
        {'symbol': 'ETH',   'address': '0x2170ed0880ac9a755fd29b2688956bd959f933f8', 'decimals': 18},
        {'symbol': 'Cake',  'address': '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82', 'decimals': 18},
        {'symbol': 'BTCB',  'address': '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c', 'decimals': 18},
    ],
    'Arbitrum': [
        {'symbol': 'USDT',  'address': '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', 'decimals': 6},
        {'symbol': 'USDC',  'address': '0xaf88d065e77c8cc2239327c5edb3a432268e5831', 'decimals': 6},
        {'symbol': 'ARB',   'address': '0x912ce59144191c1204e64559fe8253a0e49e6548', 'decimals': 18},
        {'symbol': 'WBTC',  'address': '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f', 'decimals': 8},
    ],
    'Scroll': [
        {'symbol': 'USDC',  'address': '0x06efdbff2a14a7c8e15944d1f4a48f9f95f663a4', 'decimals': 6},
        {'symbol': 'USDT',  'address': '0xf55bec9cafdb3a3e221dc78e2d31c7709a189aa5', 'decimals': 6},
        {'symbol': 'WETH',  'address': '0x5300000000000000000000000000000000000004', 'decimals': 18},
    ],
}
