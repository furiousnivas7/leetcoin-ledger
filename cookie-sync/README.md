# Cookie sync (optional, higher-risk path)

This is a **separate, opt-in tool** from the main tracker + extension. The rest of
this project deliberately never touches your LeetCode session cookie (see the root
`AGENTS.md` / `CLAUDE.md`). This folder is the documented exception, added because
DevTools' element picker was too fiddly to use reliably for the extension's
selector-override flow.

**Read this before using it.** `LEETCODE_SESSION` is a bearer credential - anyone who
has that value can act as you on leetcode.com, no password needed. This tool asks you
to copy that value into a local file. Treat it exactly like a password:

- Never commit `cookie-sync/.env.local` or `cookie-sync/query.local.json` (both are
  already gitignored via the root `.gitignore`).
- Never paste the cookie value into a chat, issue, or anywhere outside this local file.
- The cookie expires/rotates periodically - if it stops working, just re-copy a fresh one.
- When you're done experimenting, you can revoke it for real by logging out of
  leetcode.com (that invalidates the session server-side).

## Step 1 - get your cookie values and confirm they work

1. On `leetcode.com`, open DevTools -> **Application** tab (Chrome) -> **Cookies** ->
   `https://leetcode.com`.
2. Find `LEETCODE_SESSION` and `csrftoken`, copy their **Value** column.
3. `cp cookie-sync/.env.local.example cookie-sync/.env.local` and paste both values in.
4. Run:
   ```
   node --env-file=cookie-sync/.env.local cookie-sync/whoami.mjs
   ```
   You should see `Authenticated as: <your username>`. If it says "Not signed in,"
   the cookie is stale - copy it again from a fresh page load.

## Step 2 - capture LeetCode's own real balance query (don't guess it)

I don't know LeetCode's private GraphQL schema for the coin balance with certainty,
and guessing wrong would just waste your time with a silent failure. Instead, capture
the *exact* query LeetCode's own frontend sends:

1. DevTools -> **Network** tab -> filter by `graphql`.
2. Visit whatever page actually shows your coin balance (try the little coin icon near
   your avatar, or `leetcode.com/store/`).
3. In the Network list, find the `POST /graphql` request that fired around then. Click
   it -> **Payload** (or **Request**) tab.
4. Copy the `query` string and the `variables` object.
5. `cp cookie-sync/query.local.json.example cookie-sync/query.local.json` and paste
   both in.

## Step 3 - run it

```
node --env-file=cookie-sync/.env.local cookie-sync/balance.mjs
```

This prints the full raw response as JSON. Find the number that matches your real
balance in there, and tell me its field path (e.g. `data.userProfile.coins`) - I'll
add a one-line extractor so it just prints the number.

## Known limitation: the points endpoint is Cloudflare-challenged

`https://leetcode.com/points/api/total/` (the endpoint that returns `{"points": N}`)
returns a Cloudflare "Just a moment..." managed-challenge page (HTTP 403,
`cf-mitigated: challenge`) when called from a plain script with a replayed cookie —
even with a valid session and matching headers. Cloudflare ties its challenge to
browser-level signals (TLS fingerprint, JS execution, etc.) that a Node `fetch()`
can't reproduce by copying headers alone.

**This is exactly why the Chrome extension calls this same endpoint instead** (see
`extension/content-leetcode.js`) — from inside a real, already-authenticated
leetcode.com tab, it's a same-origin request the browser handles like any other,
no challenge triggered. If you just want your balance automated, prefer the
extension over pushing further on this script. `whoami.mjs` still works fine since
`/graphql` isn't challenge-protected the same way.

## What this does NOT do

It doesn't write into `leetcoin-ledger.html` for you. Once you have the number, paste
it into the tracker's own **Sync** box by hand, same as the very first version of this
tool always supported. Wiring this script directly into the tracker would mean the
tracker file itself needs to somehow get at this cookie too - which reintroduces the
exact risk this project was built to avoid. Keep the blast radius to this one folder.
