/**
 * Static coin manifest — metadata for the top ~100 coins.
 * Images come from CoinGecko's CDN (stable URLs that rarely change).
 * Having this hardcoded means the /api/crypto/coins endpoint does NOT
 * need to call CoinGecko just to get names and logos.
 *
 * coingeckoId is used only if Hyperliquid AND Binance both fail to
 * provide price data for a coin.
 */

export interface CoinMeta {
  id: string;           // CoinGecko ID (used as internal app identifier)
  symbol: string;       // Ticker, e.g. "BTC"
  name: string;
  image: string;        // CoinGecko CDN URL
  hyperliquidSymbol: string; // Symbol used on Hyperliquid
  binanceSymbol: string;     // Base symbol used on Binance (quote appended as USDT/USDC)
}

export const COIN_MANIFEST: CoinMeta[] = [
  { id: "bitcoin",            symbol: "BTC",    name: "Bitcoin",            hyperliquidSymbol: "BTC",    binanceSymbol: "BTC",    image: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png" },
  { id: "ethereum",           symbol: "ETH",    name: "Ethereum",           hyperliquidSymbol: "ETH",    binanceSymbol: "ETH",    image: "https://assets.coingecko.com/coins/images/279/small/ethereum.png" },
  { id: "tether",             symbol: "USDT",   name: "Tether",             hyperliquidSymbol: "USDT",   binanceSymbol: "USDT",   image: "https://assets.coingecko.com/coins/images/325/small/Tether.png" },
  { id: "binancecoin",        symbol: "BNB",    name: "BNB",                hyperliquidSymbol: "BNB",    binanceSymbol: "BNB",    image: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png" },
  { id: "solana",             symbol: "SOL",    name: "Solana",             hyperliquidSymbol: "SOL",    binanceSymbol: "SOL",    image: "https://assets.coingecko.com/coins/images/4128/small/solana.png" },
  { id: "usd-coin",           symbol: "USDC",   name: "USD Coin",           hyperliquidSymbol: "USDC",   binanceSymbol: "USDC",   image: "https://assets.coingecko.com/coins/images/6319/small/usdc.png" },
  { id: "ripple",             symbol: "XRP",    name: "XRP",                hyperliquidSymbol: "XRP",    binanceSymbol: "XRP",    image: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png" },
  { id: "dogecoin",           symbol: "DOGE",   name: "Dogecoin",           hyperliquidSymbol: "DOGE",   binanceSymbol: "DOGE",   image: "https://assets.coingecko.com/coins/images/5/small/dogecoin.png" },
  { id: "hyperliquid",        symbol: "HYPE",   name: "Hyperliquid",        hyperliquidSymbol: "HYPE",   binanceSymbol: "HYPE",   image: "https://assets.coingecko.com/coins/images/40845/small/hyperliquid.jpeg" },
  { id: "cardano",            symbol: "ADA",    name: "Cardano",            hyperliquidSymbol: "ADA",    binanceSymbol: "ADA",    image: "https://assets.coingecko.com/coins/images/975/small/cardano.png" },
  { id: "avalanche-2",        symbol: "AVAX",   name: "Avalanche",          hyperliquidSymbol: "AVAX",   binanceSymbol: "AVAX",   image: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png" },
  { id: "tron",               symbol: "TRX",    name: "TRON",               hyperliquidSymbol: "TRX",    binanceSymbol: "TRX",    image: "https://assets.coingecko.com/coins/images/1094/small/tron-logo.png" },
  { id: "hedera-hashgraph",   symbol: "HBAR",   name: "Hedera",             hyperliquidSymbol: "HBAR",   binanceSymbol: "HBAR",   image: "https://assets.coingecko.com/coins/images/3688/small/hbar.png" },
  { id: "polkadot",           symbol: "DOT",    name: "Polkadot",           hyperliquidSymbol: "DOT",    binanceSymbol: "DOT",    image: "https://assets.coingecko.com/coins/images/12171/small/polkadot.png" },
  { id: "chainlink",          symbol: "LINK",   name: "Chainlink",          hyperliquidSymbol: "LINK",   binanceSymbol: "LINK",   image: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png" },
  { id: "bitcoin-cash",       symbol: "BCH",    name: "Bitcoin Cash",       hyperliquidSymbol: "BCH",    binanceSymbol: "BCH",    image: "https://assets.coingecko.com/coins/images/780/small/bitcoin-cash-circle.png" },
  { id: "polygon-ecosystem-token", symbol: "POL", name: "Polygon",          hyperliquidSymbol: "POL",    binanceSymbol: "POL",    image: "https://assets.coingecko.com/coins/images/32440/small/polygon.png" },
  { id: "matic-network",      symbol: "MATIC",  name: "Polygon (old)",      hyperliquidSymbol: "MATIC",  binanceSymbol: "MATIC",  image: "https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png" },
  { id: "shiba-inu",          symbol: "SHIB",   name: "Shiba Inu",          hyperliquidSymbol: "SHIB",   binanceSymbol: "SHIB",   image: "https://assets.coingecko.com/coins/images/11939/small/shiba.png" },
  { id: "toncoin",            symbol: "TON",    name: "Toncoin",            hyperliquidSymbol: "TON",    binanceSymbol: "TON",    image: "https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png" },
  { id: "litecoin",           symbol: "LTC",    name: "Litecoin",           hyperliquidSymbol: "LTC",    binanceSymbol: "LTC",    image: "https://assets.coingecko.com/coins/images/2/small/litecoin.png" },
  { id: "uniswap",            symbol: "UNI",    name: "Uniswap",            hyperliquidSymbol: "UNI",    binanceSymbol: "UNI",    image: "https://assets.coingecko.com/coins/images/12504/small/uni.jpg" },
  { id: "near-protocol",      symbol: "NEAR",   name: "NEAR Protocol",      hyperliquidSymbol: "NEAR",   binanceSymbol: "NEAR",   image: "https://assets.coingecko.com/coins/images/10365/small/near.jpg" },
  { id: "cosmos",             symbol: "ATOM",   name: "Cosmos",             hyperliquidSymbol: "ATOM",   binanceSymbol: "ATOM",   image: "https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png" },
  { id: "stellar",            symbol: "XLM",    name: "Stellar",            hyperliquidSymbol: "XLM",    binanceSymbol: "XLM",    image: "https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png" },
  { id: "arbitrum",           symbol: "ARB",    name: "Arbitrum",           hyperliquidSymbol: "ARB",    binanceSymbol: "ARB",    image: "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg" },
  { id: "optimism",           symbol: "OP",     name: "Optimism",           hyperliquidSymbol: "OP",     binanceSymbol: "OP",     image: "https://assets.coingecko.com/coins/images/25244/small/Optimism.png" },
  { id: "aptos",              symbol: "APT",    name: "Aptos",              hyperliquidSymbol: "APT",    binanceSymbol: "APT",    image: "https://assets.coingecko.com/coins/images/26455/small/aptos_round.png" },
  { id: "sui",                symbol: "SUI",    name: "Sui",                hyperliquidSymbol: "SUI",    binanceSymbol: "SUI",    image: "https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg" },
  { id: "pepe",               symbol: "PEPE",   name: "Pepe",               hyperliquidSymbol: "PEPE",   binanceSymbol: "PEPE",   image: "https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg" },
  { id: "injective-protocol", symbol: "INJ",    name: "Injective",          hyperliquidSymbol: "INJ",    binanceSymbol: "INJ",    image: "https://assets.coingecko.com/coins/images/12882/small/Secondary_Symbol.png" },
  { id: "celestia",           symbol: "TIA",    name: "Celestia",           hyperliquidSymbol: "TIA",    binanceSymbol: "TIA",    image: "https://assets.coingecko.com/coins/images/31967/small/tia.jpg" },
  { id: "aave",               symbol: "AAVE",   name: "Aave",               hyperliquidSymbol: "AAVE",   binanceSymbol: "AAVE",   image: "https://assets.coingecko.com/coins/images/12645/small/AAVE.png" },
  { id: "internet-computer",  symbol: "ICP",    name: "Internet Computer",  hyperliquidSymbol: "ICP",    binanceSymbol: "ICP",    image: "https://assets.coingecko.com/coins/images/14495/small/Internet_Computer_logo.png" },
  { id: "leo-token",          symbol: "LEO",    name: "UNUS SED LEO",       hyperliquidSymbol: "LEO",    binanceSymbol: "LEO",    image: "https://assets.coingecko.com/coins/images/8418/small/leo-token.png" },
  { id: "ethereum-classic",   symbol: "ETC",    name: "Ethereum Classic",   hyperliquidSymbol: "ETC",    binanceSymbol: "ETC",    image: "https://assets.coingecko.com/coins/images/453/small/ethereum-classic-logo.png" },
  { id: "crypto-com-chain",   symbol: "CRO",    name: "Cronos",             hyperliquidSymbol: "CRO",    binanceSymbol: "CRO",    image: "https://assets.coingecko.com/coins/images/7310/small/cro_token_logo.png" },
  { id: "filecoin",           symbol: "FIL",    name: "Filecoin",           hyperliquidSymbol: "FIL",    binanceSymbol: "FIL",    image: "https://assets.coingecko.com/coins/images/12817/small/filecoin.png" },
  { id: "render-token",       symbol: "RNDR",   name: "Render",             hyperliquidSymbol: "RNDR",   binanceSymbol: "RNDR",   image: "https://assets.coingecko.com/coins/images/11636/small/rndr.png" },
  { id: "lido-dao",           symbol: "LDO",    name: "Lido DAO",           hyperliquidSymbol: "LDO",    binanceSymbol: "LDO",    image: "https://assets.coingecko.com/coins/images/13573/small/Lido_DAO.png" },
  { id: "immutable-x",        symbol: "IMX",    name: "Immutable",          hyperliquidSymbol: "IMX",    binanceSymbol: "IMX",    image: "https://assets.coingecko.com/coins/images/17233/small/immutableX-symbol-BLK-RGB.png" },
  { id: "the-graph",          symbol: "GRT",    name: "The Graph",          hyperliquidSymbol: "GRT",    binanceSymbol: "GRT",    image: "https://assets.coingecko.com/coins/images/13397/small/Graph_Token.png" },
  { id: "maker",              symbol: "MKR",    name: "Maker",              hyperliquidSymbol: "MKR",    binanceSymbol: "MKR",    image: "https://assets.coingecko.com/coins/images/1364/small/Mark_Maker.png" },
  { id: "bitcoin-cash-sv",    symbol: "BSV",    name: "Bitcoin SV",         hyperliquidSymbol: "BSV",    binanceSymbol: "BSV",    image: "https://assets.coingecko.com/coins/images/6799/small/BSV.png" },
  { id: "monero",             symbol: "XMR",    name: "Monero",             hyperliquidSymbol: "XMR",    binanceSymbol: "XMR",    image: "https://assets.coingecko.com/coins/images/69/small/monero_logo.png" },
  { id: "sei-network",        symbol: "SEI",    name: "Sei",                hyperliquidSymbol: "SEI",    binanceSymbol: "SEI",    image: "https://assets.coingecko.com/coins/images/28205/small/Sei_Logo_-_Transparent.png" },
  { id: "worldcoin-wld",      symbol: "WLD",    name: "Worldcoin",          hyperliquidSymbol: "WLD",    binanceSymbol: "WLD",    image: "https://assets.coingecko.com/coins/images/31069/small/worldcoin.jpeg" },
  { id: "jupiter-exchange-solana", symbol: "JUP", name: "Jupiter",         hyperliquidSymbol: "JUP",    binanceSymbol: "JUP",    image: "https://assets.coingecko.com/coins/images/34188/small/jup.png" },
  { id: "jito-governance-token",   symbol: "JTO", name: "Jito",            hyperliquidSymbol: "JTO",    binanceSymbol: "JTO",    image: "https://assets.coingecko.com/coins/images/33228/small/jto.png" },
  { id: "bonk",               symbol: "BONK",   name: "Bonk",               hyperliquidSymbol: "BONK",   binanceSymbol: "BONK",   image: "https://assets.coingecko.com/coins/images/28600/small/bonk.jpg" },
  { id: "dogwifcoin",         symbol: "WIF",    name: "dogwifhat",          hyperliquidSymbol: "WIF",    binanceSymbol: "WIF",    image: "https://assets.coingecko.com/coins/images/33566/small/dogwifhat.jpg" },
  { id: "pendle",             symbol: "PENDLE", name: "Pendle",             hyperliquidSymbol: "PENDLE", binanceSymbol: "PENDLE", image: "https://assets.coingecko.com/coins/images/15069/small/Pendle_Logo_Normal-03.png" },
  { id: "pyth-network",       symbol: "PYTH",   name: "Pyth Network",       hyperliquidSymbol: "PYTH",   binanceSymbol: "PYTH",   image: "https://assets.coingecko.com/coins/images/31924/small/pyth.png" },
  { id: "starknet",           symbol: "STRK",   name: "Starknet",           hyperliquidSymbol: "STRK",   binanceSymbol: "STRK",   image: "https://assets.coingecko.com/coins/images/26433/small/starknet.png" },
  { id: "ethena",             symbol: "ENA",    name: "Ethena",             hyperliquidSymbol: "ENA",    binanceSymbol: "ENA",    image: "https://assets.coingecko.com/coins/images/36530/small/ethena.png" },
  { id: "ondo-finance",       symbol: "ONDO",   name: "Ondo",               hyperliquidSymbol: "ONDO",   binanceSymbol: "ONDO",   image: "https://assets.coingecko.com/coins/images/26580/small/ONDO.png" },
  { id: "blur",               symbol: "BLUR",   name: "Blur",               hyperliquidSymbol: "BLUR",   binanceSymbol: "BLUR",   image: "https://assets.coingecko.com/coins/images/28453/small/blur.png" },
  { id: "curve-dao-token",    symbol: "CRV",    name: "Curve DAO",          hyperliquidSymbol: "CRV",    binanceSymbol: "CRV",    image: "https://assets.coingecko.com/coins/images/12124/small/Curve.png" },
  { id: "compound-governance-token", symbol: "COMP", name: "Compound",     hyperliquidSymbol: "COMP",   binanceSymbol: "COMP",   image: "https://assets.coingecko.com/coins/images/10775/small/COMP.png" },
  { id: "yearn-finance",      symbol: "YFI",    name: "yearn.finance",      hyperliquidSymbol: "YFI",    binanceSymbol: "YFI",    image: "https://assets.coingecko.com/coins/images/11849/small/yearn.png" },
  { id: "sushi",              symbol: "SUSHI",  name: "SushiSwap",          hyperliquidSymbol: "SUSHI",  binanceSymbol: "SUSHI",  image: "https://assets.coingecko.com/coins/images/12271/small/512x512_Logo_no_chop.png" },
  { id: "1inch",              symbol: "1INCH",  name: "1inch",              hyperliquidSymbol: "1INCH",  binanceSymbol: "1INCH",  image: "https://assets.coingecko.com/coins/images/13469/small/1inch-token.png" },
  { id: "pancakeswap-token",  symbol: "CAKE",   name: "PancakeSwap",        hyperliquidSymbol: "CAKE",   binanceSymbol: "CAKE",   image: "https://assets.coingecko.com/coins/images/12632/small/pancakeswap-cake-logo_%281%29.png" },
  { id: "gala",               symbol: "GALA",   name: "GALA",               hyperliquidSymbol: "GALA",   binanceSymbol: "GALA",   image: "https://assets.coingecko.com/coins/images/12493/small/GALA-COINGECKO.png" },
  { id: "axie-infinity",      symbol: "AXS",    name: "Axie Infinity",      hyperliquidSymbol: "AXS",    binanceSymbol: "AXS",    image: "https://assets.coingecko.com/coins/images/13029/small/axie_infinity_logo.png" },
  { id: "the-sandbox",        symbol: "SAND",   name: "The Sandbox",        hyperliquidSymbol: "SAND",   binanceSymbol: "SAND",   image: "https://assets.coingecko.com/coins/images/12129/small/sandbox_logo.jpg" },
  { id: "decentraland",       symbol: "MANA",   name: "Decentraland",       hyperliquidSymbol: "MANA",   binanceSymbol: "MANA",   image: "https://assets.coingecko.com/coins/images/878/small/decentraland-mana.png" },
  { id: "fantom",             symbol: "FTM",    name: "Fantom",             hyperliquidSymbol: "FTM",    binanceSymbol: "FTM",    image: "https://assets.coingecko.com/coins/images/4001/small/Fantom_round.png" },
  { id: "algorand",           symbol: "ALGO",   name: "Algorand",           hyperliquidSymbol: "ALGO",   binanceSymbol: "ALGO",   image: "https://assets.coingecko.com/coins/images/4380/small/download.png" },
  { id: "kava",               symbol: "KAVA",   name: "Kava",               hyperliquidSymbol: "KAVA",   binanceSymbol: "KAVA",   image: "https://assets.coingecko.com/coins/images/9761/small/kava.png" },
  { id: "enjincoin",          symbol: "ENJ",    name: "Enjin Coin",         hyperliquidSymbol: "ENJ",    binanceSymbol: "ENJ",    image: "https://assets.coingecko.com/coins/images/1102/small/enjin-coin-logo.png" },
  { id: "basic-attention-token", symbol: "BAT", name: "Basic Attention",    hyperliquidSymbol: "BAT",    binanceSymbol: "BAT",    image: "https://assets.coingecko.com/coins/images/677/small/basic-attention-token.png" },
  { id: "rocketpool",         symbol: "RPL",    name: "Rocket Pool",        hyperliquidSymbol: "RPL",    binanceSymbol: "RPL",    image: "https://assets.coingecko.com/coins/images/2090/small/rocket_pool_%28RPL%29.png" },
  { id: "flow",               symbol: "FLOW",   name: "Flow",               hyperliquidSymbol: "FLOW",   binanceSymbol: "FLOW",   image: "https://assets.coingecko.com/coins/images/13446/small/5f6294c0c7a8cda55cb1c936_Flow_Wordmark.png" },
  { id: "eos",                symbol: "EOS",    name: "EOS",                hyperliquidSymbol: "EOS",    binanceSymbol: "EOS",    image: "https://assets.coingecko.com/coins/images/738/small/eos-eos-logo.png" },
  { id: "tezos",              symbol: "XTZ",    name: "Tezos",              hyperliquidSymbol: "XTZ",    binanceSymbol: "XTZ",    image: "https://assets.coingecko.com/coins/images/976/small/Tezos-logo.png" },
  { id: "zilliqa",            symbol: "ZIL",    name: "Zilliqa",            hyperliquidSymbol: "ZIL",    binanceSymbol: "ZIL",    image: "https://assets.coingecko.com/coins/images/2687/small/Zilliqa-logo.png" },
  { id: "theta-network",      symbol: "THETA",  name: "Theta Network",      hyperliquidSymbol: "THETA",  binanceSymbol: "THETA",  image: "https://assets.coingecko.com/coins/images/2538/small/theta-token-logo.png" },
  { id: "neo",                symbol: "NEO",    name: "Neo",                hyperliquidSymbol: "NEO",    binanceSymbol: "NEO",    image: "https://assets.coingecko.com/coins/images/480/small/NEO_512_512.png" },
  { id: "vechain",            symbol: "VET",    name: "VeChain",            hyperliquidSymbol: "VET",    binanceSymbol: "VET",    image: "https://assets.coingecko.com/coins/images/1167/small/VeChain-Logo-768x725.png" },
  { id: "kaspa",              symbol: "KAS",    name: "Kaspa",              hyperliquidSymbol: "KAS",    binanceSymbol: "KAS",    image: "https://assets.coingecko.com/coins/images/25751/small/kaspa-icon-exchanges.png" },
  { id: "quant-network",      symbol: "QNT",    name: "Quant",              hyperliquidSymbol: "QNT",    binanceSymbol: "QNT",    image: "https://assets.coingecko.com/coins/images/3370/small/5ZOu7brX_400x400.jpg" },
  { id: "mantle",             symbol: "MNT",    name: "Mantle",             hyperliquidSymbol: "MNT",    binanceSymbol: "MNT",    image: "https://assets.coingecko.com/coins/images/30980/small/token-logo.png" },
  { id: "bittensor",          symbol: "TAO",    name: "Bittensor",          hyperliquidSymbol: "TAO",    binanceSymbol: "TAO",    image: "https://assets.coingecko.com/coins/images/28452/small/ARUsPeNQ_400x400.jpeg" },
  { id: "fetch-ai",           symbol: "FET",    name: "Fetch.ai",           hyperliquidSymbol: "FET",    binanceSymbol: "FET",    image: "https://assets.coingecko.com/coins/images/5681/small/Fetch.jpg" },
  { id: "floki",              symbol: "FLOKI",  name: "FLOKI",              hyperliquidSymbol: "FLOKI",  binanceSymbol: "FLOKI",  image: "https://assets.coingecko.com/coins/images/16746/small/PNG_image.png" },
  { id: "thorchain",          symbol: "RUNE",   name: "THORChain",          hyperliquidSymbol: "RUNE",   binanceSymbol: "RUNE",   image: "https://assets.coingecko.com/coins/images/6595/small/Rune200x200.png" },
  { id: "synthetix-network-token", symbol: "SNX", name: "Synthetix",        hyperliquidSymbol: "SNX",    binanceSymbol: "SNX",    image: "https://assets.coingecko.com/coins/images/3406/small/SNX.png" },
  { id: "mina-protocol",      symbol: "MINA",   name: "Mina Protocol",      hyperliquidSymbol: "MINA",   binanceSymbol: "MINA",   image: "https://assets.coingecko.com/coins/images/15628/small/JM4_vQ34_400x400.png" },
  { id: "conflux-token",      symbol: "CFX",    name: "Conflux",            hyperliquidSymbol: "CFX",    binanceSymbol: "CFX",    image: "https://assets.coingecko.com/coins/images/13079/small/3vuYMbjN.png" },
  { id: "dydx-chain",         symbol: "DYDX",   name: "dYdX",               hyperliquidSymbol: "DYDX",   binanceSymbol: "DYDX",   image: "https://assets.coingecko.com/coins/images/17500/small/hjnIm9bV.jpg" },
  { id: "oasis-network",      symbol: "ROSE",   name: "Oasis Network",      hyperliquidSymbol: "ROSE",   binanceSymbol: "ROSE",   image: "https://assets.coingecko.com/coins/images/13162/small/rose.png" },
  { id: "akash-network",      symbol: "AKT",    name: "Akash Network",      hyperliquidSymbol: "AKT",    binanceSymbol: "AKT",    image: "https://assets.coingecko.com/coins/images/12785/small/akash-logo.png" },
  { id: "gmx",                symbol: "GMX",    name: "GMX",                hyperliquidSymbol: "GMX",    binanceSymbol: "GMX",    image: "https://assets.coingecko.com/coins/images/18323/small/arbit.png" },
  { id: "arweave",            symbol: "AR",     name: "Arweave",            hyperliquidSymbol: "AR",     binanceSymbol: "AR",     image: "https://assets.coingecko.com/coins/images/4343/small/oRt6SiEN_400x400.jpg" },
  { id: "stacks",             symbol: "STX",    name: "Stacks",             hyperliquidSymbol: "STX",    binanceSymbol: "STX",    image: "https://assets.coingecko.com/coins/images/2069/small/Stacks_logo_full.png" },
  { id: "zcash",              symbol: "ZEC",    name: "Zcash",              hyperliquidSymbol: "ZEC",    binanceSymbol: "ZEC",    image: "https://assets.coingecko.com/coins/images/486/small/circle-zcash-color.png" },
  { id: "dash",               symbol: "DASH",   name: "Dash",               hyperliquidSymbol: "DASH",   binanceSymbol: "DASH",   image: "https://assets.coingecko.com/coins/images/19/small/dash-logo.png" },
];

/** Look up a coin by its CoinGecko ID */
export function getCoinById(id: string): CoinMeta | undefined {
  return COIN_MANIFEST.find((c) => c.id === id);
}

/** Look up a coin by its ticker symbol */
export function getCoinBySymbol(symbol: string): CoinMeta | undefined {
  return COIN_MANIFEST.find(
    (c) => c.symbol.toLowerCase() === symbol.toLowerCase()
  );
}
