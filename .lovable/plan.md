# MT5 EA: app-signal entries with 1-minute auto close

## What you will get
- A new file **MultiSignalBot_v4.mq5** in your Files. Older bot files stay unchanged.
- One EA on any single chart watching XAUUSD, BTCUSD, EURUSD, GBPUSD, USDJPY (broker ending like `m` supported, same as v3).
- Same rules as the AurumPulse app's notifications: BUY or SELL opens a trade, WAIT does nothing.
- Fixed **0.02 lot**, no SL and no TP on the order.
- Each trade closes **exactly 60 seconds after entry**, whether in profit or loss. No profit/loss target closing.
- After closing, the next trade on that pair opens only on the **next new signal** (new direction, or the same direction after its 1-hour signal window ends) — the same rule the app uses for repeat notifications. So it won't reopen the same signal every minute.
- One open trade per pair at a time.

## Settings you can change
- Lot size (0.02), hold time in seconds (60), broker symbol ending (`m`), on/off per pair, magic number.

## Technical details
- Built from v3: same score engine (EMA 9/21 M15, EMA 50/200 H1, price vs EMA50 H1, RSI 14 M15/H1, MACD hist M15; ±4 threshold), same symbol resolver, filling-mode detection, and weekend close window (BTC trades all week).
- Remove the profit/loss exit; replace with a timer (every 1 second) that closes any EA position whose open time is 60+ seconds old, with retry if the close is rejected.
- Per-pair memory of last signal direction and its expiry so a signal triggers only one trade.
- Difference to know: the EA uses your broker's prices, the app uses a separate gold price feed, so timing can differ slightly. I can't compile here; compile in MetaEditor (F7) and test on demo first.
