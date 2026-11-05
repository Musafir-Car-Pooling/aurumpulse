<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Use the allowlisted market registry and shared pure signal engine for every instrument; this preserves the existing gold strategy while keeping quote precision market-specific.
- Persist unattended market scans and deduplicated BUY/SELL alerts through the managed authenticated scan job and its transactional database function; browser polling only reads saved results.
- Keep paid messaging disabled until a sender connection is approved, then implement verified durable WhatsApp callback handling before enabling sends; recipient details must never appear in public market responses.
- Signal reads require a signed-in user with an active trial, premium period or admin role, enforced by database policies and server checks; premium is granted only by the database activation function (admin approval or verified crypto payment callback), never by the browser.
