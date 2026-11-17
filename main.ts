// Dip-and-trend bot for make.fun btc-race-24h-20261117-0603.
//
// Trades Coinbase Wrapped BTC (CBBTC) against USDC, one-minute bars, long
// only, one open position at most. The whole strategy is two rules, all
// in integer basis points, all measured on closes:
//
//   1. Buy the dip: when the close is more than 0.9% below the close 240
//      bars (4 hours) ago, buy with all cash. A full-size round trip costs
//      about 26 bps in fees, slippage and price impact, so a dip buy only
//      pays when the price recovers more than that; on the dev window the
//      4-hour return swings between -1.5% and +1.6%, and a -0.9% dip is
//      usually followed by a bounce of at least 0.8%.
//   2. Take profit: once in a position, sell everything when the close is
//      more than 0.8% above the close we bought on. Otherwise hold to the
//      end of the window; the harness flattens whatever is left.
//
// What was tried and dropped, on the dev window (grade-local, exact):
//   - Riding a strong uptrend (buy when the 240-bar return is above
//     +1.0%) LOST money: the dev window's +1.0% readings sit at the top
//     of the day's range, and the price ends 0.7% below the first such
//     buy. The momentum rule is disabled (MOM_BPS 10000, unreachable).
//   - A late safety buy with 2 hours left (bar 1320) also LOST money on
//     this window: the bot was flat at bar 1320 and the close then sits
//     0.26% above the final close, so the late buy paid the round trip
//     and the drift. The late buy is disabled (LATE_BAR 1440, unreachable).
//   - A deeper dip threshold (-1.5%) catches only one bar on the dev
//     window and nets about +$4.57; -0.9% catches eight dips and nets
//     about +$20.68. The whole neighbourhood (dip -0.7% to -1.0%,
//     take profit +0.6% to +1.0%) nets +$13.87 to +$21.71, so the chosen
//     values sit inside a broad positive plateau, not on a spike.
//
// Why not a faster signal? One-minute returns on this pool are tiny
// (about 6 bps of noise) and flat bars are common, so any signal faster
// than a few hours trades mostly noise and pays the 26 bps round trip
// over and over. The baselines in the kit show the same: the EMA-cross
// bot makes dozens of trades on the dev window and loses heavily.
//
// Local grade on the published dev window (grade-local, process driver):
// net PnL +20.68 USDC, 8 trades, maximum drawdown 0.72%, fees 3.23 USDC,
// 0 rejected orders, two executions byte-identical. That clears the dev
// gate (net PnL above $0), which is what lets the entry race.
//
// Deterministic: integer arithmetic only, no clock, no environment, no
// randomness. Every order carries max_slippage_bps 150 (1.5%), far above
// the largest one-minute move seen on the dev window (about 45 bps) plus
// slippage and impact, so a fill is almost never rejected for slippage,
// while a genuinely wild bar still cannot fill far from the last close.

import { runBars } from './vendor/makefun-bars.ts';
import type { BarsState, Batch, OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const WINDOW = 240; // bars (4 hours) for the return that drives the rules
const DIP_BPS = 90; // buy when the 240-bar return is below -0.9%
const MOM_BPS = 10000; // momentum rule disabled: +100.00% is unreachable
const TAKE_PROFIT_BPS = 80; // sell when up 0.8% from the buy close
const LATE_BAR = 1440; // late buy disabled: bar 1440 never arrives
const MAX_SLIPPAGE_BPS = 150;
const MIN_NOTIONAL = 1_000_000n; // 1 USDC, the harness minimum for a buy

const closes: bigint[] = [];
let entryClose: bigint | null = null;

function retBps(now: bigint, then: bigint): bigint {
  // (now / then - 1) in basis points, truncated toward zero.
  return (now * 10000n) / then - 10000n;
}

await runBars({
  onBatch(state: BarsState, batch: Batch): OrderInput[] {
    const bar = batch.bars.find((b) => b.symbol === SYMBOL);
    if (bar === undefined) return [];
    const close = BigInt(bar.c);
    closes.push(close);
    const idx = closes.length - 1;

    const held = state.positions.get(SYMBOL)?.qty ?? 0n;
    if (held === 0n) entryClose = null;

    if (held === 0n) {
      if (idx < WINDOW) return [];
      const r240 = retBps(close, closes[idx - WINDOW]);
      const buy =
        r240 < -BigInt(DIP_BPS) || r240 > BigInt(MOM_BPS) || idx >= LATE_BAR;
      if (!buy) return [];
      if (state.cash <= MIN_NOTIONAL) return [];
      entryClose = close;
      return [
        {
          side: 'buy',
          symbol: SYMBOL,
          notional_quote_units: state.cash,
          max_slippage_bps: MAX_SLIPPAGE_BPS,
        },
      ];
    }

    // In a position: take profit above the buy close, otherwise hold.
    if (entryClose !== null && retBps(close, entryClose) > BigInt(TAKE_PROFIT_BPS)) {
      return [
        {
          side: 'sell',
          symbol: SYMBOL,
          qty: held,
          max_slippage_bps: MAX_SLIPPAGE_BPS,
        },
      ];
    }
    return [];
  },
});
