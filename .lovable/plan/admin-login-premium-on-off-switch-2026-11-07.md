# Admin login + Premium on/off switch

## What you get
1. **Admin login: pp@gmail.com / pppllmm**
   - The app creates this account once, on the server, with that password. It is marked as admin and is already confirmed, so you don't need a confirmation email.
   - The password is never written into the app's public code, so visitors can't read it.
   - After signing in, the admin goes straight to the Admin panel.
2. **Admin panel: new "Settings" tab**, next to Payments, Users and Methods.
   - **Premium mode** switch (On/Off), with a short note explaining what each setting does.
3. **When Premium is OFF**
   - Anyone who opens the link sees the home screen with live signals right away.
   - No sign-up or login screens, no trial or "trial ended" boxes, and no Packages link.
   - Signals, the market buttons and alerts work for everyone.
   - The admin can still sign in through a hidden admin address (/auth) to switch Premium back on.
4. **When Premium is ON** (works like today)
   - Visitors must sign up or log in.
   - New users get the 3-day trial, then need a package ($1 / $5 / $15).
   - Payments and admin approval work as they do now.

## Technical details
- New single-row table `app_settings(premium_enabled boolean)` with public read access. Only admins can change it, checked with `has_role`.
- A server function creates or updates pp@gmail.com through the admin auth API, with email already confirmed, and assigns the admin role. It runs once from a protected admin setup route, using the password stored as a secret (`ADMIN_PASSWORD`), not in the code.
- Signal access checks (`getSignal`, `getMarketBoard`, database policies) allow anyone when `premium_enabled = false`. Otherwise they keep the current trial/premium/admin check.
- Home, the side menu and the packages page read the setting. When Premium is off they hide sign-in, packages and trial UI, and `/packages` redirects to home.
- Tests: when Premium is off, a signed-out user can read signals; when it's on, they are blocked.

## Note
The sign-up security check may reject "pppllmm" because it's short and easy to guess. Creating the account on the server usually gets around this. If it still gets rejected, I'll tell you and ask for a slightly stronger password.
