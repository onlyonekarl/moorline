Moorline

A cross-chain liquidation shield built on NEAR Intents.

Built for the NEAR Hackathon, track: Unstoppable DeFi.

The problem

DeFi lending positions get liquidated fast. Often the user holds plenty of funds on another chain, but moving them by hand through bridges is too slow when the market is crashing. Liquidation penalties are expensive, and most people only find out after it's too late.

The idea

Moorline watches a lending position and defends it automatically. The user sets a rescue policy once. When the health factor drops below the trigger, Moorline requests a cross-chain swap through NEAR Intents to bring funds to the endangered position, but only if the swap passes the user's policy checks.

The agent can never spend outside the limits the user set.

How it works

	1.	Watch. Moorline monitors the position's health factor.
	2.	Trigger. If health factor falls below the trigger (default 1.4), a rescue is planned. Rescue size scales with how far the position has fallen.
	3.	Quote. Moorline asks the NEAR Intents 1Click API for a live cross-chain quote (USDC on Arbitrum to USDC on Ethereum).
	4.	Check policy. The quote is checked against the user's rules. If the fee is too high, the rescue is blocked.
	5.	Rescue. If approved, the funds move and the health factor recovers.

Rescue policy

Rule	Default	Purpose
Trigger health factor	1.4	When to start a rescue
Max spend per rescue	$100	Hard cap on what the agent can move
Min rescue size	$25	Below this, fees outweigh the benefit
Max fee	1.5%	Blocks rescues that cost too much

Why a minimum rescue size?

Testing the live API showed the swap fee is mostly a fixed cost of about $0.30, not a percentage:

Amount	Output	Approx. fee
$5	4.70	~6%
$30	29.70	~1.0%
$50	49.69	~0.6%

Small rescues are inefficient, so the policy enforces a floor.

What is real and what is simulated

Real (live data):

	•	Token list from NEAR Intents
	•	Cross-chain swap quotes from the 1Click API
	•	Fee calculation and policy decision logic

Simulated in this version:

	•	The health factor (a scripted market crash)
	•	Rescue execution (no funds are moved by the dashboard)

Tech stack

	•	TypeScript, Node.js
	•	NEAR Intents 1Click API (/v0/tokens, /v0/quote)
	•	Plain HTML/CSS/JS dashboard served by a small Node server

Run it

Requires Node.js 18 or newer.

npm install
npx tsx server.ts

Open http://localhost:3000 and press Simulate market crash.

Other scripts

npx tsx quote.ts      # request one dry quote and print it
npx tsx moorline.ts   # run the policy engine in the terminal

Project structure

server.ts     Node server: serves the dashboard, exposes /api/policy and /api/quote
index.html    Dashboard: health factor, status banner, live quote card, activity log
moorline.ts   Policy engine as a command-line script
quote.ts      Minimal NEAR Intents dry-quote example

Roadmap

	•	Execute real rescues: deposit to the quoted address and track status until the swap completes
	•	Read live health factors from a real lending protocol
	•	Per-user policies stored on NEAR
	•	Chain Signatures for signing without bridges or custodians
	•	Multi-chain, multi-asset rescue routes
	•	Notifications when a rescue triggers

Safety notes

	•	Moorline only requests dry quotes in this version and moves no funds.
	•	Never commit private keys. Keep secrets in a .env file, which is git-ignored.

License

MIT