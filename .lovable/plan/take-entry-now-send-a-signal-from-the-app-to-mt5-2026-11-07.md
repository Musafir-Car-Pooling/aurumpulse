# "Take entry now": send a signal from the app to MT5

Yes, this can be done. MT5 can't receive messages pushed from a website. Instead, your MT5 bot asks the app every few seconds whether there is a new order. If there is, it places the trade and reports back.

```text
App: tap "Take entry now"  ->  order saved in app  ->  MT5 bot checks every 3 sec
     ->  places trade  ->  app shows "Executed at 2,345.10" (or the error)
```

## What you get
1. **Connect MT5 page** (in the side menu)
   - Tap "Generate connect key" to get a private key, which you paste into the bot's settings.
   - Shows whether the bot is online and when it last checked in.
   - "Disconnect" cancels the key straight away.
2. **"Take entry now" button** under every BUY/SELL signal. It isn't shown for WAIT or expired signals.
   - Asks you to confirm first, e.g. "BUY XAUUSD 0.02 lot?"
   - Then shows the order's status: Sent → Executed (with price and ticket number) or Failed (with the reason).
   - If no bot is connected, it shows "Connect MT5 first" instead.
3. **New MT5 bot: AurumPulse Bridge EA** (.mq5 file)
   - Settings: the connect key, lot size (default 0.02), close time (default 1 minute; 0 = keep the trade open), and broker suffix (default `m`, e.g. XAUUSDm).
   - No stop loss, matching your earlier bots.
   - Each order is placed only once, even if the internet drops.
   - Orders older than 2 minutes are ignored, so the bot never places a late trade on an old price.
4. **Who can use it:** only signed-in users with trial or premium access, and admins. When Premium mode is off, this button is hidden, because there is no login.

## One-time setup in MT5
Go to Tools → Options → Expert Advisors, tick "Allow WebRequest", and add the app's web address. The bot's chart panel will show this reminder.

## Technical details
- Two new tables:
  - `mt5_links`: user_id, a hashed key, last_seen.
  - `trade_orders`: user_id, market, direction, lot, signal snapshot, status (pending/sent/executed/failed/expired), ticket, price, error, timestamps.
  - Database policies: only the owner can read their own rows. Writes happen only through server code.
- Server functions for the app (sign-in required, trial/premium checked):
  - Create or revoke the connect key; the key is shown only once and stored hashed.
  - Create an order, only from a live, non-expired BUY/SELL signal.
  - List my orders.
- Bot address `/api/public/mt5/poll`:
  - Uses the connect key from a header.
  - Hands out pending orders under 2 minutes old one at a time (claimed with a row lock), and marks older ones expired.
- Bot address `/api/public/mt5/report`: the bot sends back the ticket, price or error.
- The app checks order status every 3 seconds while an order is pending.
- EA: WebRequest polling every 3 sec, symbol suffix resolver, automatic filling mode, an order-ID check so a trade is never doubled, and timed close.
- Tests: an expired signal is rejected; a stale order is not handed to the bot; a revoked key is refused.
