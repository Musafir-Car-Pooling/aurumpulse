# MT5: signal SL/TP entries + Auto Trade switch

## What you will get
- **Trades use the signal's SL, TP1 and TP2.** Every MT5 entry gets the signal's Stop Loss and Take Profit. No 60-second auto close any more; you can close the trade yourself in MT5 whenever you want.
  - TP handling: half the lot closes at TP1, the rest at TP2 (MT5 allows one TP per order, so the bot opens 2 × 0.01 lots: one with TP1, one with TP2, both with the signal SL).
- **Auto Trade switch** on the Connect MT5 page (and next to the signal):
  - **On:** every new BUY/SELL signal from the background scanner (all 5 pairs) is sent to your MT5 automatically, once per signal (no repeats of the same signal).
  - **Off:** nothing is traded automatically; only the signal where you tap **Take entry now** is traded.
- Recent entries list shows whether each trade was Auto or Manual.
- New bridge file **AurumPulse_Bridge_EA_v2.mq5** in your Files (old one stays).

## Technical details
- DB: add `auto_trade boolean default false` to `mt5_links`; add `source text default 'manual'` to `trade_orders`; unique index on (user_id, market, signal time) to avoid duplicate auto orders.
- Scan job (`scan-markets`): after a fresh BUY/SELL alert is saved, insert pending `trade_orders` (source='auto') for every user with `auto_trade = true` and active signal access, including entry/SL/TP1/TP2 in `signal`.
- `placeMt5Order` stores `stopLoss` in signal too. Server fns `setAutoTrade` / `getMt5Link` returns auto_trade.
- Poll response extended: `id|market|direction|lot|sl|tp1|tp2`.
- EA v2: parses SL/TP, splits lot into two positions (TP1 / TP2), validates SL/TP against broker stop level (adjusts if too close), removes timed close, reports ticket/price.
- Tests for auto-order eligibility (only BUY/SELL, only auto_trade users, no duplicates).
- Note: auto entries only run on the published Lovable app, and the EA must be online; I can't compile MQL5 here — test on demo first.
