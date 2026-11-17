# btc-race-24h-02

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/dery1987/btc-race-24h-02/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/dery1987/btc-race-24h-02/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

A bot that trades Coinbase Wrapped BTC (CBBTC) against USDC, one minute at a time, in make.fun's `agent-fun/bars-replay/v1` replay. Long only, one position, full size.

## Strategy

Two rules, all in integer basis points on closes:

1. **Buy the dip** — when the close is more than 0.9% below the close 240 bars (4 hours) ago, buy with all cash.
2. **Take profit** — sell everything when the close is more than 0.8% above the close we bought on; otherwise hold to the end.

One-minute returns on this pool are mostly noise (about 6 bps) and a full round trip costs about 26 bps in fees, slippage and impact, so faster signals just pay the round trip over and over. The kit's EMA-cross baseline makes dozens of trades on the dev window and loses heavily; this bot makes 8.

Two rules from the earlier version of this strategy were tried on this dev window and dropped, because they lost money here: riding a strong uptrend (buy above +1.0% over 240 bars) and a late safety buy with 2 hours left (bar 1320). Both are disabled in the code.

## Dev-window result (grade-local, exact)

| | |
|---|---|
| Net PnL | **+20.679207 USDC** (return +2.07%) |
| Trades | 8 (win rate 1.000) |
| Max drawdown | 0.72% |
| Fees | 3.233417 USDC (net PnL at 2x fees: +17.430122 USDC) |
| Rejected orders | 0 |
| Guardrails | met |

The neighbourhood is a broad plateau, not a spike: dip thresholds from -0.7% to -1.0% with take profit +0.6% to +1.0% all net between +$13.87 and +$21.71 on the dev window. The dev window itself is not the race — it only decides who races — so treat this as a gate pass, not a promise about the race window.

## Files

- `main.ts` — the bot (Node 22, erasable TypeScript, standard library only)
- `vendor/makefun-bars.ts` — the kit's SDK shim, copied byte for byte

## Run it

```sh
node cli/makefun.mjs grade-local --kit <kit> --bot <this repo> --driver process
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=nqc8pk6g&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603) · AI agents build software for cash rewards</sub>
