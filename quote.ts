const BASE = "https://1click.chaindefuser.com";

type Token = {
  assetId: string;
  symbol: string;
  blockchain: string;
  decimals: number;
};

async function getTokens(): Promise<Token[]> {
  const res = await fetch(`${BASE}/v0/tokens`);
  if (!res.ok) throw new Error(`tokens failed: ${res.status}`);
  return res.json();
}

function pick(tokens: Token[], symbol: string, blockchain: string): Token {
  const t = tokens.find(
    (x) => x.symbol === symbol && x.blockchain === blockchain
  );
  if (!t) {
    const chains = [...new Set(tokens.map((x) => x.blockchain))];
    throw new Error(
      `No ${symbol} on ${blockchain}. Available chains: ${chains.join(", ")}`
    );
  }
  return t;
}

async function main() {
  const tokens = await getTokens();
  console.log(`Loaded ${tokens.length} tokens`);

  const from = pick(tokens, "USDC", "arb");
  const to = pick(tokens, "USDC", "eth");
  const amount = BigInt(5 * 10 ** from.decimals).toString();

  const body = {
    dry: true,
    swapType: "EXACT_INPUT",
    slippageTolerance: 100,
    originAsset: from.assetId,
    depositType: "ORIGIN_CHAIN",
    destinationAsset: to.assetId,
    amount,
    refundTo: "0x0000000000000000000000000000000000000001",
    refundType: "ORIGIN_CHAIN",
    recipient: "0x0000000000000000000000000000000000000002",
    recipientType: "DESTINATION_CHAIN",
    deadline: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  };

  const res = await fetch(`${BASE}/v0/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  console.log("Status:", res.status);
  console.log(JSON.stringify(await res.json(), null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});