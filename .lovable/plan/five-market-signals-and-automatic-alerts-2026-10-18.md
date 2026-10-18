# Five-market signals and automatic alerts

## What you will get
- Keep XAUUSD and add BTCUSD, EURUSD, GBPUSD, and USDJPY, each selectable with its own **Signal Now** result, entry, SL, TP1, TP2, and technical analysis.
- Scan all five markets approximately every minute, even when the app is closed. The app shows the latest scan time and whether a market is waiting, actionable, unavailable, or closed.
- Notify you only when a fresh **BUY** or **SELL** setup appears. **WAIT sends no app alert and no WhatsApp message.** Repeated scans of the same active setup will not repeatedly notify you.
- Send WhatsApp alerts to **+92 336 2004755**, including the market, direction, entry, SL, targets, and signal time.
- Preserve the app's current look and existing gold analysis; show clear connection and alert states.

## Setup needed
- Enable **Lovable Cloud** to save scan results, notification preferences, and message delivery history.
- Connect a **WhatsApp Business sender** through the connection card. Your supplied number is the recipient; a sender connection is also required. Meta may require phone/email verification and business approval.
- Automated messages outside the 24-hour customer-service window require an approved WhatsApp template; approval can take up to 48 hours, and provider charges may apply. We will not describe a message as delivered until delivery confirmation arrives.
- Always-on scanning and WhatsApp callbacks need the receiver to be published. I will prepare and verify what is possible in preview, but will not publish without your request.

## Technical approach
- Extract the current indicator calculations into a reusable, tested engine, with symbol-specific prices and decimal precision. Validate data freshness and sufficient history; suppress actionable alerts from stale or unavailable feeds, especially on closed forex/gold markets.
- Use Lovable Cloud for saved subscriptions and notification history. Protect private recipient details and paid sends with authenticated access; do not place the recipient in public responses or unrestricted sending endpoints.
- Use a durable scheduled HTTP call to a protected scan endpoint rather than a browser timer or long-running server process. Confirm scheduler availability during setup; if unsupported, report the external scheduling requirement explicitly.
- Keep browser notifications opt-in and distinguish app-visible notifications from operating-system notifications, which depend on browser permission and support.
- Save accepted WhatsApp message IDs and failed attempts. Implement the signed `/api/public/whatsapp/webhook` receiver with durable, idempotent callback processing, monotonic delivery-status updates, and scheduled recovery for unfinished work.
- Test all five market mappings, the original BUY/SELL thresholds, WAIT alert suppression, stale-data suppression, duplicate suppression, and status reconciliation. Verify live market selection and Signal Now through the app; verify WhatsApp delivery after sender, approved template, and published callback destination are available.