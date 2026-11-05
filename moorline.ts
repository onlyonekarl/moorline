const BASE = "https://1click.chaindefuser.com";

// The user's rescue policy
const policy = {
  triggerHF: 1.4, // rescue when health factor drops below this
  maxSpendUsd: 100, // never spend more than this per rescue
  minRescueUsd: 25, // below this, fees eat too much
  maxFeePct: 1.5, // block the rescue if the swap costs more than this
  from: { symbol: "USDC", chain: "arb" },
  to: { symbol: "USDC", chain: "eth" },
};

type Token = {
  assetId: string;
  symbol: string;
  blockchain: string;
  decimals: number;
};

// Simulated crash: health factor falls each check
let hf = 2.0;
function readHealthFactor() {
  hf -= 0.2;
  return Number(hf.toFixed(2));
}

function rescueSizeUsd(current: number) {
  const size = 25 + (policy.triggerHF - current) * 100;
  return Math.min(policy.maxSpendUsd, Math.max(policy.minRescueUsd, size));
}

async function getQuote(usd: number) {
  const tokens: Token[] = await (await fetch(`${BASE}/v0/tokens`)).json();
  const find = (s: string, c: string) =>
    tokens.find((t) => t.symbol === s && t.blockchain === c)!;
  const from = find(policy.from.symbol, policy.from.chain);
  const to = find(policy.to.symbol, policy.to.chain);

  const res = await fetch(`${BASE}/v0/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dry: true,
      swapType: "EXACT_INPUT",
      slippageTolerance: 100,
      originAsset: from.assetId,
      depositType: "ORIGIN_CHAIN",
      destinationAsset: to.assetId,
      amount: BigInt(Math.round(usd * 10 ** from.decimals)).toString(),
      refundTo: "0x0000000000000000000000000000000000000001",
      refundType: "ORIGIN_CHAIN",
      recipient: "0x0000000000000000000000000000000000000002",
      recipientType: "DESTINATION_CHAIN",
      deadline: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    }),
  });
  const data = await res.json();
  const q = data.quote ?? data;
  return {
    amountIn: Number(q.amountInFormatted),
    amountOut: Number(q.amountOutFormatted),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log("Moorline is watching your position...\n");
  for (let i = 0; i < 8; i++) {
    const current = readHealthFactor();
    console.log(`Health factor: ${current}`);

    if (current < policy.triggerHF) {
      const usd = rescueSizeUsd(current);
      console.log(`\nTRIGGERED. Planning rescue of $${usd.toFixed(2)}...`);
      const { amountIn, amountOut } = await getQuote(usd);
      const feePct = ((amountIn - amountOut) / amountIn) * 100;
      console.log(`Quote: ${amountIn} in, ${amountOut} out (fee ${feePct.toFixed(2)}%)`);

      if (feePct > policy.maxFeePct) {
        console.log("BLOCKED by policy: fee too high.");
      } else {
        console.log("APPROVED by policy. Ready to execute rescue.");
      }
      return;
    }
    await sleep(1500);
  }
}

main().catch(console.error);