import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const BASE = "https://1click.chaindefuser.com";

const policy = {
  triggerHF: 1.4,
  maxSpendUsd: 100,
  minRescueUsd: 25,
  maxFeePct: 1.5,
};

async function getQuote(usd: number) {
  const tokens: any[] = await (await fetch(`${BASE}/v0/tokens`)).json();
  const find = (s: string, c: string) =>
    tokens.find((t) => t.symbol === s && t.blockchain === c);
  const from = find("USDC", "arb");
  const to = find("USDC", "eth");

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
  const amountIn = Number(q.amountInFormatted);
  const amountOut = Number(q.amountOutFormatted);
  return {
    amountIn,
    amountOut,
    feePct: ((amountIn - amountOut) / amountIn) * 100,
  };
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  const json = (o: unknown) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(o));
  };

  try {
    if (url.pathname === "/api/policy") return json(policy);

    if (url.pathname === "/api/quote") {
      return json(await getQuote(Number(url.searchParams.get("usd"))));
    }

    res.setHeader("Content-Type", "text/html");
    res.end(readFileSync("index.html"));
  } catch (e) {
    res.statusCode = 500;
    json({ error: String(e) });
  }
}).listen(3000, () =>
  console.log("Moorline dashboard on http://localhost:3000")
);