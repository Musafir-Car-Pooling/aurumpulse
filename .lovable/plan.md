# MT5 EA: auto-trade the app's 5-market signals

## What you will get
- A new file **MultiSignalBot.mq5** in your Files. Your existing gold bot file stays as it is.
- One EA, attached to any single chart, that watches all 5 pairs: XAUUSD, BTCUSD, EURUSD, GBPUSD, USDJPY.
- It uses the same rules the app uses for its alerts, so it opens a trade when the app would send a BUY or SELL notification. WAIT means no trade.
- Fixed **0.02 lot**. **No SL and no TP** are placed on the order.
- The trade closes automatically once it is **+4 USD in profit** or **-2 USD in loss** (the trade's live profit/loss in your account currency).
- Only one open trade per pair at a time. After a trade closes, the same signal won't open again until a new or opposite signal appears, or the 1-hour signal window ends (same as the app's repeat-alert rule).

## Settings you can change in MT5
- Symbol names for each pair, because brokers add endings like `XAUUSDm` or `BTCUSD.`. Each pair can also be switched on or off.
- Lot size (0.02), profit target (4 USD), loss limit (2 USD), and whether swap/commission count toward profit.
- Magic number, so this EA's trades stay separate from your other bot.

## Technical details
- Signal score, matching the app's engine: EMA 9/21 on M15 (±2), EMA 50/200 on H1 (±2), price vs H1 EMA50 (±1), RSI 14 on M15 and H1 (>70 −1, <30 +1, >55 +1, <45 −1), MACD 12/26/9 histogram on M15 (sign ±1, rising/falling ±1). Score ≥ +4 BUY, ≤ −4 SELL.
- Checks every few seconds on a timer, using closed and current M15/H1 bars from each symbol, so it does not depend on the chart it is attached to.
- Skips gold/forex during the same weekend close window the app uses; BTCUSD trades all week. Skips symbols that are missing, not tradeable, or have no recent price data.
- Profit/loss exit checked on every timer pass using position profit (+ swap/commission if enabled), closed at market.
- Difference to know about: the app uses a separate gold spot price feed; the EA uses your broker's price, so prices and signal timing can differ slightly.
- Before delivering, I will check that the code is complete and consistent. I can't compile it here, so you will compile it in MetaEditor (F7) and test it on a demo account first.
